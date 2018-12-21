/* eslint-disable no-console */

const Boom = require('boom');
const axios = require('axios');
const pLocate = require('p-locate');

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
    const subids = fsAccount.subscriptions.slice(0,limit);
    if (subids && subids.length) {
      result.subid = await pLocate(
        subids,
        (id) => (
          axios
          .get(options.fsurl + "subscriptions/" + id)
          .then((response) => (response.data))
          .then((sub) => {
            if (sub.active){
              const isCorrectProduct = (products === undefined) || (products.length === 0) || (
                (typeof(sub.product) === "string") && (products.includes(sub.product))
              );
              if (isCorrectProduct){
                result.sub = sub;
                return true;
              }
            }
            return false;
          })
        )
      );
    }
    return result;  // { subid: 'fastspring-subscription-id', sub: { fastspring-subscription-object }}
  }

  async function getGoogleDriveAssociatedSubscription(req, reply) {
    req.fastspring = {};
    if (req.drive) {
      try {
        const email = await validEmail(req);
        const fsAccount = await fastspringAccount(email);
        req.fastspring.acct = fsAccount;
        const result = await findActiveSubscription(fsAccount);
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
