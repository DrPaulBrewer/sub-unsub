# sub-unsub

A Hapi plugin for managing incoming subscription updates from fastspring

## Usage

### Compatibility

* sub-unsub works with hapi 16 

### Installation

    npm i sub-unsub -S

### Configuration

#### ./path/to/hapi/config/sub-unsub

	{
	        "hexidSecret": "akfjalkfjasdlkfjasdlkfjasd",
		"signatureSecret": "dfkajflkajdflkajflkajdlkfjaklf",
		"subscriptionDB": "http://your-couchdb-ip-address:5984/"
        }

### Example Hapi Server

# TODO TODO TODO TODO 

#### ./path/to/hapi/index.js

**Note: this requires some set up in Fastspring before it will work**

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
