/* eslint-disable no-console */

const Boom = require('boom');
const axios = require('axios');

function subUnsub(server, options, next) {
  if (!options.fsurl) throw Boom.badImplementation("options.fsurl missing in sub-unsub configuration");
  if (!Array.isArray(options.fsproduct)) throw Boom.badImplementation("options.fsproduct array missing in sub-unsub configuration");

  async function validEmail(req){
    const info = await req.drive.x.aboutMe();
    const email = info.user.emailAddress.toLowerCase().trim();
    if ((!email) || !(email.length)) throw new Error("no email");
    if (email.indexOf('@') < 0) throw new Error("email missing @ symbol");
    if ((email.startsWith('@')) || (email.endsWith('@'))) throw new Error("invalid email: " + email);
    return email;
  }

  async function fastspringAccount(email){
    const fsAccounts = await(
      axios
      .get(options.fsurl + "accounts", { params: { email } })
      .then((r) => (r.data))
    );
    if (fsAccounts.result !== "success") throw new Error("no fastspring account");
    if ((!fsAccounts.accounts) || (!fsAccounts.accounts.length)) throw new Error("missing fastspring account");
    if (fsAccounts.accounts.length > 1) throw new Error("multiple fastspring accounts");
    const fsAccount = fsAccounts.accounts[0];
    return fsAccount;
  }

  async function findActiveSubscription({
    fsAccount,
    limit,
    products
  }){
    const result = {};
    if (limit && fsAccount && fsAccount.subscriptions && (fsAccount.subscriptions.length>limit)){
      console.log("warning: in npm:sub-unsub, fsAccount.subscriptions.length = "+fsAccount.subscriptions.length+" for account: "+fsAccount.id+" exceeds scan limit:"+limit);
    }
    const subids = fsAccount.subscriptions.slice(0,limit);
    if (subids && subids.length) {
      const subdata = await(
        axios
        .get(options.fsurl+"subscriptions/"+subids.join(","))
        .then((r)=>(r.data))
      );
      const activeProductSubscriptions = (
        subdata
        .subscriptions
        .filter((s)=>(s.active))
        .filter((s)=>((products === undefined) || (products && !(products.length)) || (
          (typeof(s.product) === "string") && (products.includes(s.product)))))
        .sort((a,b)=>(-1*(+(a.changed)-(b.changed))))
      );
      result.sub = activeProductSubscriptions[0];
      result.subid = result.sub.id;
    }
    return result;  // {} or { subid: 'fastspring-subscription-id', sub: { fastspring-subscription-object }}
  }

  async function getGoogleDriveAssociatedSubscription(req, reply) {
    req.fastspring = {};
    if (req.drive) {
      try {
        const email = await validEmail(req);
        const fsAccount = await fastspringAccount(email);
        req.fastspring.acct = fsAccount;
        const result = await findActiveSubscription({
          fsAccount,
          limit: 20,
          products: options.fsproduct
        });
        Object.assign(req.fastspring, result);
      } catch (e) {
        req.fastspring.error = e.toString();
      }
    } else {
      req.fastspring.error = new Error("not signed in").toString();
    }
    reply.continue(); // continue request processing
  }

  server.dependency('bugle', (S, nextdep)=>{
    S.ext([{
      type: 'onPreAuth',
      method: getGoogleDriveAssociatedSubscription
    }]);

    nextdep(); // complete dependency registration
  });

  next();  // complete extension registration
}

subUnsub.attributes = {
  pkg: require('./package.json') // eslint-disable-line
};

module.exports = {
  register: subUnsub
};
