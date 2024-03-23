// Info: Boilerplate library. Contains Functions for Outgoing HTTP(s) requests (For NodeJS only and not browsers)
// TODO: multipart requests
'use strict';

// Shared Dependencies (Managed by Loader)
var Lib = {};


// Exclusive Dependencies
var CONFIG = require('./config'); // Loader can override it with Custom-Config

/////////////////////////// Module-Loader START ////////////////////////////////

  /********************************************************************
  Load dependencies and configurations

  @param {Set} shared_libs - Reference to libraries already loaded in memory by other modules
  @param {Set} config - Custom configuration in key-value pairs

  @return nothing
  *********************************************************************/
  const loader = function(shared_libs, config){

    // Shared Dependencies (Must be loaded in memory already)
    Lib.Utils = shared_libs.Utils;
    Lib.Debug = shared_libs.Debug;
    Lib.HttpHandler = shared_libs.HttpHandler;
    [Lib.Geo, Lib.GeoInput, Lib.GeoData] = [shared_libs.Geo, shared_libs.GeoInput, shared_libs.GeoData];
    [Lib.Contact, Lib.ContactInput, Lib.ContactData] = [shared_libs.Contact, shared_libs.ContactInput, shared_libs.ContactData];
    Lib.Instance = shared_libs.Instance;
    Lib.AddressDataCore =  shared_libs.AddressDataCore;


    // Override default configuration
    if( !Lib.Utils.isNullOrUndefined(config) ){
      Object.assign(CONFIG, config); // Merge custom configuration with defaults
    }

  };

//////////////////////////// Module-Loader END /////////////////////////////////



///////////////////////////// Module Exports START /////////////////////////////
module.exports = function(shared_libs, config){

  // Run Loader
  loader(shared_libs, config);

  // Return Public Funtions of this module
  return GeoCodingGoogle;

};//////////////////////////// Module Exports END //////////////////////////////



///////////////////////////Public Functions START//////////////////////////////
const GeoCodingGoogle = { // Public functions accessible by other modules

  /********************************************************************
  Get Addresses List by Search String

  @param {reference} instance - Request Instance object reference //TODO
  @param {Function} cb  - callback function

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} search_string - Search string
  @param {String} options - Additional options for Search
  * @param {String} country - (ENUM) Additional Filtering Options for Specific County (us | pr | vi | gu)

  @callback - Request Callback(addresses_list, success, failure_code, is_internal_failure)
  * @callback {Set[]} addresses_list - Address List
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  searchPlaces: function(instance, cb, provider_key, search_string, options){

    // Initialize
    _GeoCodingGoogle.initIfNot(instance);


    // Search Places
    _GeoCodingGoogle.searchPlacesApi(
      instance, cb,
      provider_key,
      search_string,
      options
    );

  },


  /********************************************************************
  Extends an Address Received by Search place api By adding latitude and longitude

  @param {reference} instance - Request Instance object reference //TODO
  @param {Function} cb  - callback function

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} address_data - Address-Data Object
  @param {String} options - Additional options for Search

  @callback - Request Callback(address_data, success, failure_code, is_internal_failure)
  * @callback {Set} address_data - Address-Data
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  geoCoding: function(instance, cb, provider_key, address_data, options){

    // Initialize
    _GeoCodingGoogle.initIfNot(instance);


    // Get Lat-Long
    _GeoCodingGoogle.geoCodingApi(
      instance, cb,
      provider_key,
      address_data['provider_data']['search_string'], // Extract from Provider Data
      options
    );

  },


  /********************************************************************
  Get Address-Data from latitude and longitude

  @param {reference} instance - Request Instance object reference //TODO
  @param {Function} cb  - callback function

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} lat - Location latitude
  @param {String} lng - Location longitude

  @callback - Request Callback(address_data, success, failure_code, is_internal_failure)
  * @callback {Set} address_data - Address-Data
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  reverseGeoCoding: function(instance, cb, provider_key, lat, lng){

    // Initialize
    _GeoCodingGoogle.initIfNot(instance);


    // Get Address-Data
    _GeoCodingGoogle.reverseGeoCodingApi(
      instance, cb,
      provider_key,
      lat, lng
    );

  },

};///////////////////////////Public Functions END//////////////////////////////



//////////////////////////Private Functions START//////////////////////////////
const _GeoCodingGoogle = { // Private functions accessible within this modules only

  /********************************************************************
  API Request Builder

  @param {reference} instance - Request Instance object reference

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} search_string - Search string
  @param {String} options - Additional options for Search

  @return {Set} request_data - Request Data Object
  *********************************************************************/
  searchPlacesApiRequestBuilder: function(instance, provider_key, search_string, options){

    // Get Search Places session token (Automatically Check If invalid token, otherwise autogenerate new token)
    var search_session_token = _GeoCodingGoogle.checkAndCreateSearchSessionToken(instance);

    // Make Request Data for Geocoding
    var request_data = {
      input: search_string,
      sessiontoken: search_session_token,
      key: provider_key
    }


    // Add Additional-Options if Available
    if(
      !Lib.Utils.isEmpty(options) &&
      !Lib.Utils.isNullOrUndefined(options['country'])
    ){
      request_data['components'] = `country:${options['country']}` // Filter For Secific-Places
    }


    // Return Request Data
    return request_data;
  },


  /********************************************************************
  SearchPlaces-Api Response Resolver

  @param {Integer} response_status - Http Status
  @param {Set} response_header - Http Response Header
  @param {Set} response_body - Http Response Body

  @callback - Request Callback(addresses_list, success, failure_code, is_internal_failure)
  * @callback {Set[]} addresses_list - Addresses-List
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  searchPlacesApiResponseResolver: function(response_status, response_header, response_body){

    // Check If Success
    if(
      response_status == 200 && // Gives error message at 200 also
      !Lib.Utils.isEmpty(response_body) &&
      ('status' in response_body) &&
      (
        response_body['status'] == 'OK' || // OK, Means Success
        response_body['status'] == 'ZERO_RESULTS' // ZERO_RESULTS, Means Success
      )
    ){

      // Initialize with Empty List
      var addresses_list = [];

      // If Results Found, then Process Addresses-List
      if( !Lib.Utils.isEmpty(response_body['predictions']) ){
        addresses_list = _GeoCodingGoogle.createAddressListData(response_body['predictions']); // Convert Google Response into Our Addresses-List
      }

      // Return Addresses-List
      return { // Success
        'addresses_list': addresses_list,
        'success': true, // Success - Failed
        'failure_code': null, // No Failure
        'is_internal_failure': null // No Internal Failure
      };

    }


    // Reach here means Failed

    // Determine Failure-Code on basis of HTTP-Status
    var failure_code = 'UNKNOWN_FAILURE' // Default Error

    if(
      !Lib.Utils.isEmpty(response_body) &&
      Lib.Utils.isObject(response_body) &&
      response_body['status'] in CONFIG.GOOGLE_ERROR_CODES
    ){
      // Map Google's failure-code to our Failure-Code
      failure_code = CONFIG.GOOGLE_ERROR_CODES[response_body['status']];
    }

    // Determine internal-failure on Basis of failure-code
    var is_internal_failure = CONFIG['GOOGLE_FAILURE_CODES'][failure_code]['ii'];


    // Log failure for research
    Lib.Debug.logErrorForResearch(
      failure_code,
      'Cause: Google Error' +
      '\ncmd: Search Places Api' +
      '\nparams: ' + JSON.stringify({
        'Status-code': response_status,
        'Error-status': response_body['status'],
        'Error-message': response_body['error_message']
      })
    );


    return { // Failed. No Data recieved
      'addresses_list': null,
      'success': false, // Success - Failed
      'failure_code': failure_code, // Failure Code
      'is_internal_failure': is_internal_failure // Is Internal Failure
    };

  },


  /********************************************************************
  Search-Places Api Request

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} search_string - Search string
  @param {String} options - Additional options for Search

  @callback - Request Callback(addresses_list, success, failure_code, is_internal_failure)
  * @callback {Set[]} addresses_list - Address List
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  searchPlacesApi: function(
    instance, cb,
    provider_key,
    search_string,
    options
  ){

    // Construct URL
    var url = _GeoCodingGoogle.urlBuilder('place/autocomplete');

    // Construct params
    var http_params = _GeoCodingGoogle.searchPlacesApiRequestBuilder(
      instance,
      provider_key,
      search_string,
      options
    );

    // Initialize Additional Service parameters for http Request
    let options = {
      'request_content_type': 'json',
    };


    // Make HTTP Request
    Lib.HttpHandler.fetchJSON(
      instance,
      function(err, response_status, response_headers, response_data){

          if(err){ // Print Error
            return cb(err); // Invoke callback with error
          }


          // Process Raw-Response and Convert to Transaction-Response Data. Return
          const { addresses_list, success, failure_code, is_internal_failure } = _GeoCodingGoogle.searchPlacesApiResponseResolver( // Resolve Transaction Response
            response_status,
            response_headers,
            response_data
          );

          // Return API-Response
          cb(
            addresses_list,
            success,
            failure_code,
            is_internal_failure
          );

      },
      url, // url
      'GET', // Http-method
      http_params, // params
      options // Additional Service Parameters
    );

  },



  /********************************************************************
  API Request Builder

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} search_string - Search string

  @return {Set} request_data - Request Data Object
  *********************************************************************/
  geoCodingApiRequestBuilder: function(provider_key, search_string){

    // Make Request Data for Geocoding
    var request_data = {
      'address': search_string,
      'key': provider_key
    }


    // Return Request Data
    return request_data;
  },


  /********************************************************************
  GeoCoding-Api Response Resolver

  @param {Integer} response_status - Http Status
  @param {Set} response_header - Http Response Header
  @param {Set} response_body - Http Response Body

  @callback - Request Callback(addresses_list, success, failure_code, is_internal_failure)
  * @callback {Set[]} addresses_list - Address List
  * @callback {Boolean} address_data - 'false', if No Address-Data found
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  geoCodingApiResponseResolver: function(response_status, response_header, response_body){

    // Check If Success
    if(
      response_status == 200 && // Gives error message at 200 also
      !Lib.Utils.isEmpty(response_body) &&
      ('status' in response_body) &&
      (
        response_body['status'] == 'OK' || // OK, Means Success
        response_body['status'] == 'ZERO_RESULTS' // ZERO_RESULTS, Means Success
      )
    ){

      // Initialize with Empty Data
      var address_data;

      // If Results Found, then Process Address-Data
      if( !Lib.Utils.isEmpty(response_body['results']) ){
        address_data = _GeoCodingGoogle.googleGeoCodingDataToAddressData(response_body['results'][0]); // Convert Google Response into Our Addresses-List
      }

      // Return Addresses-List
      return { // Success
        'address_data': address_data,
        'success': true, // Success - Failed
        'failure_code': null, // No Failure
        'is_internal_failure': null // No Internal Failure
      };

    }


    // Reach here means Failed


    // Determine Failure-Code on basis of HTTP-Status
    var failure_code = 'UNKNOWN_FAILURE' // Default Error

    if(
      !Lib.Utils.isEmpty(response_body) &&
      Lib.Utils.isObject(response_body) &&
      response_body['status'] in CONFIG.GOOGLE_ERROR_CODES // Must be a Known payment-Processor
    ){
      // Map Failure Code
      failure_code = CONFIG.GOOGLE_ERROR_CODES[response_body['status']];
    }

    // Determine internal-failure on Basis of failure-code
    var is_internal_failure = CONFIG['GOOGLE_FAILURE_CODES'][failure_code]['ii'];


    // Log failure for research
    Lib.Debug.logErrorForResearch(
      failure_code,
      'Cause: Google Error' +
      '\ncmd: GeoCoding Api' +
      '\nparams: ' + JSON.stringify({
        'Status-code': response_status,
        'Error-status': response_body['status'],
        'Error-message': response_body['error_message']
      })
    );


    // Return
    return { // Failed. No Data recieved
      'address_data': null,
      'success': false, // Success - Failed
      'failure_code': failure_code, // Failure Code
      'is_internal_failure': is_internal_failure // Is Internal Failure
    };

  },


  /********************************************************************
  Get latitude and longitude of an Address using GeoCoding-API
  Note: https://developers.google.com/maps/documentation/geocoding/overview

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} search_string - Search string
  @param {String} options - Additional options

  @callback - Request Callback(address_data, success, failure_code, is_internal_failure)
  * @callback {Set} address_data - Address-Data
  * @callback {Boolean} address_data - 'false', if No Address-Data found
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  geoCodingApi: function(
    instance, cb,
    provider_key,
    search_string,
    options
  ){

    // Construct URL
    var url = _GeoCodingGoogle.urlBuilder('geocode');

    // Construct params
    var http_params = _GeoCodingGoogle.geoCodingApiRequestBuilder(provider_key, search_string);

    // Initialize Additional Service parameters for http Request
    let options = {
      'request_content_type': 'json',
    };


    // Make HTTP Request
    Lib.HttpHandler.fetchJSON(
      instance,
      function(err, response_status, response_headers, response_data){

        if(err){ // Print Error
          return cb(err); // Invoke callback with error
        }


        // Process Raw-Response and Convert to Transaction-Response Data. Return
        const { address_data, success, failure_code, is_internal_failure } = _GeoCodingGoogle.geoCodingApiResponseResolver( // Resolve Response
          response_status,
          response_headers,
          response_data
        )

        // Return API-Response
        cb(
          address_data,
          success,
          failure_code,
          is_internal_failure
        );


      },
      url, // url
      'GET', // Http-method
      http_params, // params
      options // Additional Service Parameters
    );

  },



  /********************************************************************
  API Request Builder

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} lat - Latitude coordinates
  @param {String} lng - Longitude coordinates

  @return {Set} request_data - Request Data Object
  *********************************************************************/
  reverseGeoCodingApiRequestBuilder: function(provider_key, lat, lng){

    // Make Request Data for Reverse Geocoding
    var request_data = {
      'latlng': lat + ',' + lng,
      'key': provider_key
    }

    // Return Request Data
    return request_data;
  },


  /********************************************************************
  Reverse GeoCoding-Api Response Resolver

  @param {Integer} response_status - Http Status
  @param {Set} response_header - Http Response Header
  @param {Set} response_body - Http Response Body

  @callback - Request Callback(address_data, success, failure_code, is_internal_failure)
  * @callback {Set} address_data - Address-Data
  * @callback {Boolean} address_data - 'false', if No Address-Data found
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  reverseGeoCodingApiResponseResolver: function(response_status, response_header, response_body){

    // GeoCoding and ReverseGeocoding have same Responses
    return _GeoCodingGoogle.geoCodingApiResponseResolver(
      response_status,
      response_header,
      response_body
    );

  },


  /********************************************************************
  Reverse GeoCoding Api Request
  Note: https://developers.google.com/maps/documentation/geocoding/overview#ReverseGeocoding

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} provider_key - Map Service Provider API-Key
  @param {String} lat - Latitude coordinates
  @param {String} lng - Longitude coordinates

  @callback - Request Callback(address_data, success, failure_code, is_internal_failure)
  * @callback {Set} address_data - Address-Data
  * @callback {Boolean} address_data - 'false', if No Address-Data found
  * @callback {Boolean} success - success
  * @callback {String} failure_code - Failure Code
  * @callback {Boolean} is_internal_failure - Is this failure internal or can it be shown to user
  *********************************************************************/
  reverseGeoCodingApi: function(
    instance, cb,
    provider_key,
    lat, lng
  ){

    // Construct URL
    var url = _GeoCodingGoogle.urlBuilder('geocode');

    // Construct params
    var http_params = _GeoCodingGoogle.reverseGeoCodingApiRequestBuilder(provider_key, lat, lng);

    // Initialize Additional Service parameters for http Request
    let options = {
      'request_content_type': 'json',
    };


    // Make HTTP Request
    Lib.HttpHandler.fetchJSON(
      instance,
      function(err, response_status, response_headers, response_data){

        if(err){ // Print Error
          return cb(err); // Invoke callback with error
        }


        // Process Raw-Response and Convert to Address-Data. Return
        const { address_data, success, failure_code, is_internal_failure } = _GeoCodingGoogle.reverseGeoCodingApiResponseResolver( // Resolve Transaction Response
          response_status,
          response_headers,
          response_data
        );

        // Return API-Response
        cb(
          address_data,
          success,
          failure_code,
          is_internal_failure
        );

      },
      url, // url
      'GET', // Http-method
      http_params, // params
      options // Additional Service Parameters
    );

  },



  /********************************************************************
  Extract And Convert Google Places Addresses-List to our Address-Data format

  @param {Set[]} addresses_list - List of places

  @return {Set[]} foramtted_addresses_list - Formatted Addresses-List Data
  *********************************************************************/
  createAddressListData: function(addresses_list){

    // Check for Empty Results
    if( Lib.Utils.isEmpty(addresses_list) ){
      return [];
    }


    // Iterate Each Mapbox Place's Address And Convert into our Address-data
    var foramtted_addresses_list = [];
    addresses_list.forEach(function(google_address){

      // Format Mapbox-Address to our Address-Data
      let address_data = _GeoCodingGoogle.googlePlacesDataToAddressData(google_address);

      // Check if Address Data was Successfully formatted then push to foramtted-addresses-list
      if( address_data ){
        foramtted_addresses_list.push(address_data);
      }

    });


    // Return foramtted-addresses-list
    return foramtted_addresses_list;

  },


  /********************************************************************
  Return Foramtted Addresses-List

  @param {Set} address_data - Address-Data

  @return {Set[]} foramtted_addresses_list - Formatted Addresses-List Data
  *********************************************************************/
  googlePlacesDataToAddressData: function(address_data){

    // Check for Address-Data has required Keys
    if(
      !Lib.Utils.isObject(address_data) || // Address-Data must be Object
      Lib.Utils.isEmpty(address_data['description']) // Description-key must not be Empty
    ){
      return false;
    }


    // Return Formatted Address
    return Lib.ContactData.createAddressData(
      {
        'address_id': null,
        'string': address_data['description'],
        'provider_data': {
          'search_string': address_data['description']
        },
        'title': null,
        'type': null,
        'country': null,
        'sub_division': null,
        'locality': null,
        'line1': null,
        'line2': null,
        'postal_code': null,
        'extra': null,
        'latitude': null,
        'longitude': null
      }
    );

  },


  /********************************************************************
  Convert Google Address To our Address-Data format

  @param {Set} address_data - Address-Data

  @return {Set} address - Address Data Object in key-value
  @return {Boolean} address - False, If Invalid Address
  *********************************************************************/
  googleGeoCodingDataToAddressData: function(address_data){

    // Initialize Address Object
    var formatted_address_data = {
      'address_id': null,
      'string': address_data['formatted_address'],
      'title': null,
      'type': 'oth', // (oth:other (Default) | off:office | hom:home)
      'line1': null, // (street_number, premise, route/neighborhood)
      'line2': null, // Hamden (locality)
      'sub_division': null, // Connecticut (administrative_area_level_1) state
      'locality': null, // New Haven County (administrative_area_level_2)
      'postal_code': null, // 06518 (postal_code)
      'country': null, // United States (country)
      'extra': null,
      'latitude': null,
      'longitude': null,
      'provider_data': {
        'search_string': address_data['formatted_address']
      }
    };


    // Construct Address-type
    if(
      address_data['types'].includes('point_of_interest') ||
      address_data['types'].includes('establishment')
    ){
      formatted_address_data['type'] = 'off';
    }
    else if(
      address_data['types'].includes('street_address')
    ){
      formatted_address_data['type'] = 'hom';
    }


    // Check & assign coordinates if present
    if(
      !Lib.Utils.isEmpty(address_data['geometry']) &&
      !Lib.Utils.isEmpty(address_data['geometry']['location'])
    ){
      formatted_address_data['latitude'] = Lib.GeoInput.sanitizeLatitude(address_data['geometry']['location']['lat']);
      formatted_address_data['longitude'] = Lib.GeoInput.sanitizeLongitude(address_data['geometry']['location']['lng']);
    }

    // Initialize Postal-Code, Sub-Division, Line-1 and Line-2
    var sub_division;
    var postal_code;
    var line1 = [];
    var line2 = [];

    // loop through Raw-Address-Data & Convert to our Address-Data
    if( !Lib.Utils.isEmpty(address_data['address_components']) ){

      // Extract other fields of Address from mapbox data
      address_data['address_components'].forEach(function(data){

        // Extract Field Name (locality, district, region, ...)
        let field = data['types'];

        // Extract Field Value (United States, Connecticut, ...)
        let value = data['long_name'];

        // Extract Additional Short Code (us, US-CT)
        let short_value = data['short_name'];
        if(!Lib.Utils.isEmpty(short_value)){ // Always Convert Short-Name to Lower-Case
          short_value = short_value.toLowerCase();
        }


        // Extract Country
        if(
          field.includes('country') &&
          !Lib.Utils.isEmpty(short_value) &&
          Lib.ContactInput.validateAddressCountry(short_value) // Validate Country
        ){
          formatted_address_data['country'] = short_value;
        }

        // Extract Postal-Code
        else if(
          field.includes('postal_code') &&
          !Lib.Utils.isEmpty(value)
        ){
          postal_code = value;
        }

        // Extract Sub-Division
        else if(
          field.includes('administrative_area_level_1') &&
          !Lib.Utils.isEmpty(short_value)
        ){
          sub_division = short_value;
        }

        // Extract Locality
        else if(
          field.includes('administrative_area_level_2') &&
          !Lib.Utils.isEmpty(value)
        ){
          formatted_address_data['locality'] = value;
        }


        // Extract Address Line 2 (from sublocality-level 5 to 1, and administrative-area-level 5 to 3)
        else if(
          (
            field.includes('sublocality_level_5') ||
            field.includes('sublocality_level_4') ||
            field.includes('sublocality_level_3') ||
            field.includes('sublocality_level_2') ||
            field.includes('sublocality_level_1') ||
            field.includes('locality') ||
            field.includes('administrative_area_level_5') ||
            field.includes('administrative_area_level_4') ||
            field.includes('administrative_area_level_3')
          ) &&
          !Lib.Utils.isEmpty(value)
        ){
          line2.push(value);
        }


        // Extract Address Line 1 (from subpremise, premise, street_number and route)
        else if(
          (
            field.includes('subpremise') ||
            field.includes('premise') ||
            field.includes('street_number') ||
            field.includes('route')
          ) &&
          !Lib.Utils.isEmpty(value)
        ){
          line1.push(value);
        }


      }); // Loop ends here

    } // If-Condition ends here


    // Construct Line-2 Address
    if(!Lib.Utils.isEmpty(line2)){

      // Remove If Locality is Repeated in Line-2
      line2 = line2.filter(function(item) {
          return item !== formatted_address_data['locality'];
      });

      // Construct Line-2
      formatted_address_data['line2'] = line2.join(', ');
    }

    // Construct Line-1 Address
    if(!Lib.Utils.isEmpty(line1)){
      formatted_address_data['line1'] = line1.join(', ');
    }


    // Validate Sub-Division
    if( Lib.ContactInput.validateAddressSubDivision(formatted_address_data['country'], sub_division) ){
      formatted_address_data['sub_division'] = sub_division;
    }


    // Check for compulsary address fields (Country, Sub-Division)
    if(
      Lib.Utils.isEmpty(formatted_address_data['country']) ||
      Lib.Utils.isEmpty(formatted_address_data['sub_division']
    )
    ){
      return false; // Do not continue because Address-Data does not have required fields
    }

    // Validate & Assign Postal-Code
    if(
      !Lib.Utils.isEmpty(postal_code) &&
      Lib.ContactInput.validateAddressPostalCode(formatted_address_data['country'], postal_code)
    ){
      formatted_address_data['postal_code'] = Lib.ContactInput.sanitizeAddressPostalCode(postal_code);
    }


    // Return Formatted-Address
    return Lib.ContactData.createAddressData(formatted_address_data);

  },



  /********************************************************************
  Get Search Places session token (Automatically Check If invalid token, otherwise autogenerate new token)

  @param {reference} instance - Request Instance object reference

  @return {String} search_session_token - Search session token for places api
  *********************************************************************/
  checkAndCreateSearchSessionToken: function(instance){

    // Check If session token already exists & is Valid
    if(instance['geocoding']['google']['search_place_session_token']){
      return instance['geocoding']['google']['search_place_session_token'];
    }
    else{

      // Generate new session token
      instance['geocoding']['google']['search_place_session_token'] = _GeoCodingGoogle.generateSearchPlaceSessionToken();

      // Return New Session Token
      return instance['geocoding']['google']['search_place_session_token'];

    }

  },


  /********************************************************************
  Return search token for places api

  @param none

  @return {String} search_session_token - Search session token for places api
  *********************************************************************/
  generateSearchPlaceSessionToken: function(){

    return Lib.Utils.getUnixTimeInMilliSeconds();

  },



  /********************************************************************
  url Bulider

  @param {String} end_point - url end point

  @return {String} - url
  *********************************************************************/
  urlBuilder: function(end_point){

    // Creating url
    var url = CONFIG.GOOGLE_GEO_CODING_BASE_URL + `${end_point}/json`;

    // Return URL
    return url;

  },


  /********************************************************************
  Initialize AWS S3 Service Object - Only if not already initialized

  @param {reference} instance - Request Instance object reference

  @return - None
  *********************************************************************/
  initIfNot: function(instance){

    // Create 'geocoding' object in instance if it's not already present
    if( !('geocoding' in instance) ){
      instance['geocoding'] = {};
    }


    // Create 'google' object in instance.geocoding if it's not already present
    if( !('google' in instance.geocoding) ){
      instance.geocoding['google'] = {};
    }

  },

};//////////////////////////Private Functions END//////////////////////////////
