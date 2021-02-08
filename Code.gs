// Initialise community connector
var cc = DataStudioApp.createCommunityConnector();

// AuthType set to NONE for the time being. Access token will be put in manually,
// though OAuth2 implementation will make this process automatic
function getAuthType() {
  var AuthTypes = cc.AuthType;
  return cc
    .newAuthTypeResponse()
    .setAuthType(AuthTypes.NONE)
    .build();
}

// Set to true for troubleshooting purposes
function isAdminUser() {
  return true;
}

// Initialises the configuration screen
function getConfig(request) {
  var config = cc.getConfig();
  
  config.newInfo()
    .setId('Instructions')
    .setText('Enter page ID and access token to access Facebook Post Analytics');
  
  config.newTextInput()
    .setId('page_id')
    .setName('Enter page ID');
  
  config.newTextInput()
    .setId('access_token')
    .setName('Enter access token');
  
  config.setDateRangeRequired(false);
  
  return config.build();
}

// This creates the structure of the schema for the fields of the data source
function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;
  
  fields.newMetric()
    .setId('post_impressions')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newMetric()
    .setId('post_reactions_like_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('post_reactions_love_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('post_reactions_wow_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('post_reactions_haha_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('post_reactions_sorry_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);  
  
  fields.newMetric()
    .setId('post_reactions_anger_total')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newMetric()
    .setId('post_clicks')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newMetric()
    .setId('comment_count')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newMetric()
    .setId('share_count')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newDimension()
    .setId('message')
    .setType(types.TEXT);
  
  fields.newDimension()
    .setId('permalink_url')
    .setType(types.URL);
  
  fields.newDimension()
    .setId('created_time')
    .setType(types.YEAR_MONTH_DAY);
  
  return fields;
}

// Create schema
function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

// For each requested field, data from each row of the response will be pushed together into the same row 
function responseToRows(requestedFields, response) {
  return response.map(function(fbData) {
    var row = [];
    
    requestedFields.asArray().forEach(function (field) {
      switch (field.getId()) {
        case 'created_time':
          return row.push(fbData.created_time.replace(/-/g, '').replace(/T(.*)/g, ''));
        case 'post_impressions':
          return row.push(fbData.post_impressions);
        case 'post_reactions_like_total':
          return row.push(fbData.post_reactions_like_total);
        case 'post_reactions_love_total':
          return row.push(fbData.post_reactions_love_total);
        case 'post_reactions_wow_total':
          return row.push(fbData.post_reactions_wow_total);
        case 'post_reactions_haha_total':
          return row.push(fbData.post_reactions_haha_total);
        case 'post_reactions_sorry_total':
          return row.push(fbData.post_reactions_sorry_total);
        case 'post_reactions_anger_total':
          return row.push(fbData.post_reactions_anger_total);
        case 'post_clicks':
          return row.push(fbData.post_clicks);
        case 'comment_count':
          return row.push(fbData.comment_count);
        case 'share_count':
          return row.push(fbData.share_count);          
        case 'message':
          return row.push(fbData.message);
        case 'permalink_url':
          return row.push(fbData.permalink_url);
        default:
          return row.push('');
        }
      });
    return { values: row };
  });
}

// This fetches the data from the API
function getData(request) {
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  // Fetch and parse insights data from API
  var request_url = [
    'https://graph.facebook.com/v9.0/',
    request.configParams.page_id,
    '/published_posts?fields=',
    'insights.metric(',
    'post_impressions,',
    'post_reactions_like_total,',
    'post_reactions_love_total,',
    'post_reactions_wow_total,',
    'post_reactions_haha_total,',
    'post_reactions_sorry_total,',
    'post_reactions_anger_total,',
    'post_clicks),',
    'comments.summary(true),',
    'shares,',
    'message,',
    'created_time,',
    'permalink_url&',
    'access_token=',
    request.configParams.access_token
  ];
  
  // Fetches and parses the API call
  var fetchedURL = UrlFetchApp.fetch(request_url.join(''));
  var dataParsed = JSON.parse(fetchedURL).data;
  
  var parsedResponse = [];
  
  // The relevant data from the API call is pushed into an Object.
  // An Object represents a row of data. In this case, it represents
  // data related to a specific post. This is done for all posts
  // received in the API call.
  for (i = 0; i < dataParsed.length; i++) {
    var mergedData = {
      "post_impressions": dataParsed[i].insights.data[0].values[0].value,
      "post_reactions_like_total": dataParsed[i].insights.data[1].values[0].value,
      "post_reactions_love_total": dataParsed[i].insights.data[2].values[0].value,
      "post_reactions_wow_total": dataParsed[i].insights.data[3].values[0].value,
      "post_reactions_haha_total": dataParsed[i].insights.data[4].values[0].value,
      "post_reactions_sorry_total": dataParsed[i].insights.data[5].values[0].value,
      "post_reactions_anger_total": dataParsed[i].insights.data[6].values[0].value,
      "post_clicks": dataParsed[i].insights.data[7].values[0].value,
      "comment_count": dataParsed[i].comments.summary.total_count,
      "message": dataParsed[i].message,
      "created_time": dataParsed[i].created_time,
      "permalink_url": dataParsed[i].permalink_url
    };
   
    // Shares only appears in the API call for each post if share count > 0.
    // This accounts for the case where share count = 0.
    if (dataParsed[i].hasOwnProperty('shares')) {
      mergedData.share_count = dataParsed[i].shares.count;
    } else {
      mergedData.share_count = 0;
    }
    
    parsedResponse.push(mergedData); 
  }

  // Creates the rows of the Data Source
  var rows = responseToRows(requestedFields, parsedResponse);
  
  // Build Data Source
  return {
    schema: requestedFields.build(),
    rows: rows
  };
}