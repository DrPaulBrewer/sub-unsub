/* eslint-disable no-console */

const Boom = require('boom');
const axios = require('axios');

async function validEmail(drive){
  const info = await drive.x.aboutMe();
  const email = info.user.emailAddress.toLowerCase().trim();
  if ((!email) || !(email.length)) throw new Error("no email");
  if (email.indexOf('@') < 0) throw new Error("email missing @ symbol");
  return email;
}

async function fastspringAccount(email, fsurl){
  const fsAccounts = await(
    axios
    .get(fsurl + "accounts", { params: { email } })
    .then((r) => (r.data))
  );
  if (fsAccounts.result !== "success") throw new Error("no fastspring account");
  if ((!fsAccounts.accounts) || (!fsAccounts.accounts.length)) throw new Error("missing fastspring account");
  if (fsAccounts.accounts.length > 1) throw new Error("multiple fastspring accounts");
  const fsAccount = fsAccounts.accounts[0];
  return fsAccount;
}

async function findActiveProductSubscription({
  fsAccount,
  limit,
  products,
  fsurl
}){
  const result = {};
  if (limit && fsAccount && fsAccount.subscriptions && (fsAccount.subscriptions.length>limit)){
    console.log("warning: in npm:sub-unsub, fsAccount.subscriptions.length = "+fsAccount.subscriptions.length+" for account: "+fsAccount.id+" exceeds scan limit:"+limit);
  }
  const subids = fsAccount.subscriptions.slice(0,limit);
  if (subids && subids.length) {
    const subdata = await(
      axios
      .get(fsurl+"subscriptions/"+subids.join(","))
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

async function fastspringDecoration({ drive, fsurl, fsproduct }){
  const result = {};
  if (drive) {
    try {
      const email = await validEmail(drive);
      result.email = email;
      const fsAccount = await fastspringAccount(email,fsurl);
      result.acct = fsAccount;
      const subProps = await findActiveProductSubscription({
        fsAccount,
        limit: 20,
        products: fsproduct,
        fsurl
      });
      Object.assign(result, subProps);
    } catch (e) {
      result.error = e.toString();
    }
  } else {
    result.error = new Error("not signed in").toString();
  }
  return result;
}

function fastspringHapi16Decorator(fsurl, fsproduct){
  return async function(req,reply){
    req.fastspring = await fastspringDecoration({
      drive: req.drive,
      fsurl,
      fsproduct
    });
    reply.continue(); // continue request processing
  };
}

function subUnsub(server, options, next) {
  if (!options.fsurl) throw Boom.badImplementation("options.fsurl missing in sub-unsub configuration");
  if (!Array.isArray(options.fsproduct)) throw Boom.badImplementation("options.fsproduct array missing in sub-unsub configuration");
  server.dependency('bugle', (S, nextdep)=>{
    S.ext([{
      type: 'onPreAuth',
      method: fastspringHapi16Decorator(options.fsurl, options.fsproduct)
    }]);
    nextdep(); // complete dependency registration
  });
  next();  // complete extension registration
}

subUnsub.attributes = {
  pkg: require('../package.json') // eslint-disable-line
};

module.exports = {
  hapi16: {
    register: subUnsub
  }
};
