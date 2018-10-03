/* eslint-disable no-console */

const crypto = require('crypto');
const pFilter = require('p-filter');
const Boom = require('boom');
const PouchDB = require('pouchdb-node');
const Joi = require('joi');
PouchDB.plugin(require('pouchdb-upsert'));

function removeEmpty(obj){
  // recusively remove null properties from obj and nested objects
  // See Rotareti's answer on Stack Overflow
  // https://stackoverflow.com/a/38340730/103081
  Object.entries(obj).forEach(([key, val]) => {
    if (val && typeof val === 'object') removeEmpty(val);
    else if (val === null) delete obj[key];
  });
}

function subUnsub(server, options, next) {
  if (!options.hexidSecret) throw Boom.badImplementation("options.hexidSecret missing in sub-unsub configuration");
  if (!options.signatureSecret) throw Boom.badImplementation("options.signatureSecret missing in sub-unsub configuration");
  if (!options.subscriptionDB) throw Boom.badImplementation("options.subscriptionDB missing in sub-unsub configuration");

  const db = new PouchDB(options.subscriptionDB);

  function hasValidSignature(req) {
    const secret = options.signatureSecret;
    const reqSignature = req.headers[options.signatureHeader];
    if (!reqSignature) return false;
    const bodySignature = (
      crypto
      .createHmac('sha256', secret)
      .update(req.payload)
      .digest()
      .toString('base64')
    );
    return (reqSignature === bodySignature);
  }

  function hexidFor(email) {
    const secret = options.hexidSecret;
    const standardizedEmail = email.toLowerCase().trim();
    return (
      crypto
      .createHmac('sha256', secret)
      .update(standardizedEmail, 'utf8')
      .digest('hex')
    );
  }

  const schema = {};
  options.fields.date.forEach((k) => {
    schema[k] = Joi.date().timestamp('javascript').optional(); // eslint-disable-line newline-per-chained-call
  });
  options.fields.string.forEach((k) => {
    schema[k] = Joi.string().optional();
  });
  options.fields.boolean.forEach((k) => {
    schema[k] = Joi.boolean().optional();
  });

  // in .addons[i]

  schema.addons = Joi.array().items(
    Joi.object().keys({
      sku: Joi.string().optional(),
      display: Joi.string().optional(),
      quantity: Joi.number().integer()
    })
  );

  const joiOptions = {
    allowUnknown: true,
    skipFunctions: true,
    stripUnknown: true
  };

  async function task(eventType, data) {
    try {
      const email = data.account.contact.email;
      const hexid = hexidFor(email);
      // flatten data object to include any subscription fields
      if (typeof(data.subscription) === 'object') {
        Object.assign(data, data.subscription);
        delete data.subscription;
      }
      const save = await Joi.validate(data, schema, joiOptions);
      if (save) {
        if (save.id) {
          save.fsid = save.id;
          delete save.id;
        }
        save.eventType = eventType;
        save.eventReceived = Date.now();
        save._id = hexid; // eslint-disable-line no-underscore-dangle
        if (options.handledEventTypes.includes(eventType)) {
          if (save.live) {
            const result = await db.upsert(hexid, (indata) => (Object.assign({}, indata, save)));
            return result.updated;
          }
          console.log(new Date().toUTCString() + " received test event:"); // eslint-disable-line no-console
          console.log(JSON.stringify(save, null, 2)); // eslint-disable-line no-console
          return true;
        }
      }
    } catch (e) {
      console.log(`error processing Fastspring event ${eventType}, event unprocessed`); // eslint-disable-line no-console
      console.log(e); // eslint-disable-line no-console
    }
    return false;
  }

  async function getGoogleDriveAssociatedSubscription(req, reply) {
    if (req.drive) {
      try {
        const info = await req.drive.x.aboutMe();
        const email = info.user.emailAddress;
        const hexid = hexidFor(email);
        const sub = await db.get(hexid, { latest: true });
        req.sub = sub;
      } catch (e) {
        console.log("Error in getGoogleDriveAssociatedSubscription: " + e.toString()); // eslint-disable-line no-console
      }
    }
    reply.continue();
  }

  server.ext([{
    type: 'onPreAuth',
    method: getGoogleDriveAssociatedSubscription
  }]);

  server.route([{
    path: options.webhookPath,
    method: 'POST',
    config: {
        payload: {
            output: 'data',
            parse: false
        }
    },
    handler(req, reply) {
      if (!hasValidSignature(req)) {
        console.log("invalid signature");
        return reply(Boom.badRequest("invalid signature"));
      }
      try {
        req.payload = JSON.parse(req.payload);
      } catch(e){
        console.log("JSON.parse failed: "+e);
        return reply(Boom.badRequest("invalid JSON"));
      }
      removeEmpty(req.payload);
      if (!Array.isArray(req.payload.events)) {
        console.log("missing events");
        return reply(Boom.badRequest("missing events"));
      }
      return (
        pFilter(
          req.payload.events,
          (event) => (task(event.type, event.data)), { concurrency: 1 }
        )
        .then((events) => (events.map((event) => (event.id))))
        .then((ids) => (reply(ids)))
        .catch((e)=>(console.log("Error processing "+options.webhookPath+" :"+e))) // eslint-disable-line no-console
      );
    }
  }]);

  next(); // call next to complete plugin registration
}

subUnsub.attributes = {
  pkg: require('./package.json') // eslint-disable-line
};

module.exports = {
  register: subUnsub
};
