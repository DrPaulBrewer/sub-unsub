# sub-unsub

A Hapi plugin for managing incoming subscription updates from fastspring

## Usage

### Compatibility

* sub-unsub will eventually work with hapi 16 
* this software is UNTESTED 
* you really shouldn't be using this yet...

### Installation

    npm i sub-unsub -S

### Configuration

#### ./path/to/hapi/config/sub-unsub

	{
	        "hexidSecret": "akfjalkfjasdlkfjasdlkfjasd",
		"signatureSecret": "dfkajflkajdflkajflkajdlkfjaklf",
		"subscriptionDB": "http://your-couchdb-ip-address:5984/"
        }

**Note: this willl also require some set up in Fastspring before it will work**

## Features

* provides the backend webhook for Fastspring 
* update a pouchDB/couchDB database from the Fastspring subscription updates  
* anonymizes emails to hexids using a security string

## Copyright

Copyright 2018 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

## License: MIT

## No relation to FastSpring

This software is 3rd party software.

It is not a product of Fastspring
