# sub-unsub

A Hapi plugin for sites with paid user subscriptions via fastspring

## Usage

### Compatibility

* sub-unsub will eventually work with hapi 16
* this software simply doesn't work yet (Oct. 2018) and needs reorganization
* so you really shouldn"t be using this yet...

### Installation

    npm i sub-unsub -S

### Configuration

#### ./path/to/hapi/config/sub-unsub

    {
      "hexidSecret": "akfjalkfjasdlkfjasdlkfjasd",
    	"signatureSecret": "dfkajflkajdflkajflkajdlkfjaklf",
    	"subscriptionDB": "http://your-couchdb-ip-address:5984/",
      "handledEventTypes":[
        "subscription.activated",
        "subscription.deactivated",
        "subscription.updated",
        "subscription.cancelled"
      ],
      "fields": {
        "date": [
          "changed",
          "next",
          "end",
          "canceledDate",
          "deactivationDate",
          "begin",
          "nextChargeDate",
          "nextNotificationDate"
        ],
        "string":[
          "id",
          "state",
          "sku",
          "display"
        ],
        "boolean":[
          "active",
          "live",
          "adhoc",
          "autoRenew"
        ]
    }
  }


**Note: this will also require some set up in Fastspring before it will work**

## Features

* provides the backend webhook for Fastspring
* update a pouchDB/couchDB database from the Fastspring subscription updates  
* anonymizes emails to hexids using a security string
* provides `req.sub` on all requests containing most recent subscription update for Google Sign In user

## Copyright

Copyright 2018 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

## License: MIT

## No relation to FastSpring

This software is 3rd party software.

It is not a product of Fastspring
