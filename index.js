/* eslint-disable no-console */

const Boom = require('boom');
const axios = require('axios');
const pLocate = require('p-locate');

function subUnsub(server, options, next) {
  if (!options.fsurl) throw Boom.badImplementation("options.fsurl missing in sub-unsub configuration");
  if (!Array.isArray(options.fsproduct)) throw Boom.badImplementation("options.fsproduct array missing in sub-unsub configuration");

  async function getGoogleDriveAssociatedSubscription(req, reply) {
    req.fastspring = {};
    if (req.drive) {
      try {
        const info = await req.drive.x.aboutMe();
        const email = info.user.emailAddress;
        if ((!email) || !(email.length)) throw new Error("no email");
        if (email.indexOf('@')<0) throw new Error("email missing @ symbol");
        if ((email.startsWith('@')) || (email.endsWith('@'))) throw new Error("invalid email: "+email);
        const fsAccounts = await(
          axios
          .get(options.fsurl+"accounts", {params: {email}})
          .then((r)=>(r.data))
        );
        if (fsAccounts.result !== "success") throw new Error("no fastspring account");
        if ((!fsAccounts.accounts) || (!fsAccounts.accounts.length)) throw new Error("missing fastspring account");
        if (fsAccounts.accounts.length > 1) throw new Error("multiple fastspring accounts");
        const fsAccount = fsAccounts.accounts[0];
        req.fastspring.acct = fsAccount;
        const subids = fsAccount.subscriptions;
        if (subids && subids.length){
          req.fastspring.subid = await pLocate(
            subids,
            (id)=>(
              axios
                .get(options.fsurl+"subscriptions/"+id)
                .then((response)=>(response.data))
                .then((sub)=>{
                  if (
                    (sub.active) &&
                    (typeof(sub.product)==="string") &&
                    (options.fsproduct.includes(sub.product))
                  ){
                    req.fastspring.sub = sub;
                    return true;
                  }
                  return false;
                  }
                )
              )
            );
          }
      } catch (e) {
          req.fastspring.error = e.toString();
      }
    } else {
	req.fastspring.error = new Error("not signed in").toString();
    }
    reply.continue();
  }

  server.ext([{
    type: 'onPreAuth',
    method: getGoogleDriveAssociatedSubscription
  }]);

  next(); // call next to complete plugin registration
}

subUnsub.attributes = {
  pkg: require('./package.json') // eslint-disable-line
};

module.exports = {
  register: subUnsub
};
