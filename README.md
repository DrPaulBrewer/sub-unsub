# sub-unsub

A Hapi plugin for sites with paid user subscriptions via fastspring

## Usage

### Compatibility
* might work with hapi16
* has not yet seen extensive use -- use at own risk
* will need adaptations for hapi17

### Installation

    npm i sub-unsub -S

### Configuration

#### ./path/to/hapi/config/sub-unsub

    {
		    fsurl: "https://user:password@api.fastspring.com/",
		    fsproduct: ["bronze","silver","gold"]
    }


**Note: this assumes you have subscription products bronze, silver, gold set up in your Fastspring online store**

## Features
* uses req.drive, set by npm:Bugle, to obtain user's email address as registered with Google Accounts
* sanity checks email
* inquires with Fastspring if an account exists for email
* inquires with Fastspring for an active subscription associated with account that matches an entry in fsproduct array
* provides `req.fastspring` on all requests. May contain these properties: error, acct, subid, sub

## Copyright

Copyright 2018 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

## License: MIT

## No relation to FastSpring

This software is 3rd party software.

It is not a product of Fastspring
