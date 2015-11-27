/**
 * Copyright 2013 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Namespace initialization.
var dmp = dmp || {};
dmp.auth = dmp.auth || {};

/** The Drive application ID. */
dmp.auth.APPLICATION_ID = "543871781652";

/** The app's Client ID. */
dmp.auth.CLIENT_ID = "543871781652.apps.googleusercontent.com";

/** Some Google OAuth 2.0 scopes. */
dmp.auth.DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
dmp.auth.DRIVE_INSTALL_SCOPE = "https://www.googleapis.com/auth/drive.install";
dmp.auth.OPENID_SCOPE = "openid";

/** The ID of the user that is currently authorized. */
dmp.auth.userId = undefined;

/** The currently used and valid Access Token. */
dmp.auth.accessToken = undefined;

/** The timestamp at which the current accessToken will expire. */
dmp.auth.accessTokenExpieryTimestamp = undefined;

/**
 * Initializes the authorization to the API using a client-side flow with
 * redirect URI.
 *
 * @param(function) callback The callback function to call once auth is
 *                           successful.
 */
dmp.auth.initAuth = function(callback) {
  // Check if we have an access token in the hash portion of the URL.
  if (!dmp.auth.hasGoneTroughAuth()) {
    console.log("No access token yet.");
    // No Access Token so we make the users go through an OAuth flow.
    var stateParamObj = dmp.url.stringToObject(
        dmp.url.getUrlParameter("state"));
    var userId = stateParamObj ? stateParamObj.userId : undefined;
    // If no userId was found from the State param we look in the hash param.
    userId = userId ? userId : dmp.url.getHashParameter("userId");
    console.log("Found user ID: " + userId);

    // If the user ID was not found it means that the user is not coming
    // from Google Drive so we install the app using the install scope.
    var scopes = dmp.auth.DRIVE_FILE_SCOPE + " " + dmp.auth.OPENID_SCOPE + " "
        + dmp.auth.DRIVE_INSTALL_SCOPE;

    // We want to keep the currently selected songs so we keep the state URL
    // parameter if we come from Drive or we pass the list of fileIDs in the
    // URL in the state parameter.
    var stateUrlParam = dmp.url.getUrlParameter("state");
    var fileIdsHashParam = dmp.url.getHashParameter("fileIds");
    var playlistIdHashParam = dmp.url.getHashParameter("playlistId");
    var folderIdHashParam = dmp.url.getHashParameter("folderId");
    if (!stateUrlParam && (fileIdsHashParam || folderIdHashParam || playlistIdHashParam)) {
      var stateObj = {};
      stateObj.ids = fileIdsHashParam ? fileIdsHashParam.split(',') : [];
      if (folderIdHashParam) {
        stateObj.ids.push(folderIdHashParam);
      }
      if (playlistIdHashParam) {
        stateObj.ids.push(playlistIdHashParam);
      }
      stateObj.userId = dmp.url.getHashParameter("userId");
      userId = dmp.url.getHashParameter("userId") ?
          dmp.url.getHashParameter("userId") : null;
      stateUrlParam = JSON.stringify(stateObj);
    }

    // Redirect to the auth page using the OAuth 2.0 client side flow.
    var authFlowUrl = dmp.auth.createOAuthClientFlowUrl(
        dmp.auth.CLIENT_ID, scopes, userId, stateUrlParam);
    console.log("Redirecting user to: " + authFlowUrl);
    window.location.href = authFlowUrl;
  }
  // Periodically check if the user is authorized.
  dmp.auth.periodicCheckAuth(callback);
};

/**
 * Periodically checks if the user is authorized and if it is we save the new
 * accessToken and query the UserInfo API.
 *
 * @param(Function) callback The callback function to call once auth is
 *                           successful.
 */
dmp.auth.periodicCheckAuth = function(callback) {
  console.log("Checking auth.");
  // We have an Access Token which means the user has authorized the app.
  if (dmp.auth.hasGoneTroughAuth()) {
    // First we extract the access token from the hash portion of the URL.
    dmp.auth.accessToken = dmp.url.getHashParameter("access_token");
    dmp.auth.accessTokenExpieryTimestamp = new Date().getTime() + parseInt(dmp.url.getHashParameter("expires_in")) * 1000;
    dmp.ui.buildPicker(); // Rebuilding the Picker since it depends on the access token
    // TODO: handle auth errors here
    console.log("Found an access token: " + dmp.auth.accessToken);
    // Start the autorefresh chron job. Check every 60sec if the token is valid.
    window.setInterval(dmp.auth.conditionalRefreshAuth, 60000);
    dmp.auth.userId =dmp.url.getUserIdFromStateParam();
    if(dmp.auth.userId == null) {
      dmp.auth.fetchUserId(callback);
    } else if (callback) {
      callback();
    }
  } else {
    // Checking again every 0.1s because in some cases Chrome will not
    // reload the page but will only change the hash.
    console.log("Checking auth again...");
    window.setTimeout(function() {
        dmp.auth.periodicCheckAuth(callback);
      }, 100);
  }
};

/**
 * Tests if the current user has gone Through auth already for client side flow
 * using Redirect URI.
 *
 * @return{boolean} True if the user has alrady gone through auth.
 */
dmp.auth.hasGoneTroughAuth = function() {
  var accessToken = dmp.url.getHashParameter("access_token");
  var error = dmp.url.getHashParameter("error");
  return accessToken != null
      || error != null;
};

/**
 * Fetches the User's ID using the UserInfo API and saves it locally.
 */
dmp.auth.fetchUserId = function(callback) {
  gapi.client.load('oauth2', 'v2', function() {
    var accessTokenObj = new Object();
    accessTokenObj.access_token = dmp.auth.accessToken;
    accessTokenObj.token_type = "Bearer";
    accessTokenObj.expires_in = "3600";
    gapi.auth.setToken(accessTokenObj);
    gapi.client.oauth2.userinfo.get().execute(function(resp){
      if (resp.error) {
        console.log("Error while fetching the UserId: " + resp.error.message);
      } else {
        console.log("Got the UserId: " + resp.id);
        dmp.auth.userId = resp.id;
        if (callback) {
          callback();
        }
      }
    });
  });
};

/**
 * Refreshes the access token only if needed.
 */
dmp.auth.conditionalRefreshAuth = function() {
  // We refresh the access token about 10 minutes before it expires.
  if (new Date().getTime() + 600000 > dmp.auth.accessTokenExpieryTimestamp) {
    dmp.auth.autoRefreshAuth();
  }
};

/**
 * Refreshes the access token automatically.
 *
 * @param{function} callback Optional callback to call when the auth has
 *                  finished. The auth object is passed as a parameter.
 */
dmp.auth.autoRefreshAuth = function(callback) {
  var currentTimestamp = new Date().getTime();
  gapi.auth.authorize({
    client_id : dmp.auth.CLIENT_ID,
    scope : dmp.auth.DRIVE_FILE_SCOPE + " "
        + dmp.auth.OPENID_SCOPE + " "
        + dmp.auth.DRIVE_INSTALL_SCOPE,
    user_id : dmp.auth.userId ? dmp.auth.userId : null,
    immediate : true
  }, function(authResult) {
    if (authResult.error) {
      console.log("There was an error refreshing the token: "
          + authResult.error.message);
    } else {
      console.log("Automatic token refresh completed: "
          + authResult.access_token);
      // Saves the new access token.
      dmp.auth.accessToken = authResult.access_token;
      dmp.auth.accessTokenExpieryTimestamp = currentTimestamp + authResult.expires_in * 1000;
      dmp.ui.buildPicker(); // Rebuilding the Picker since it depends on the access token
    }
    // calling potential Callback.
    if (callback) {
      callback(authResult);
    }
  });
};

/**
 * Returns the URL that initiates the OAuth Client side flow using the
 * current URL without the URL parameters and the hash portion as the
 * redirect URI.
 *
 * @param{String} clientId The Client ID of the application.
 * @param{String} scopes The space delimited list of scopes to authorize.
 * @param{String} userId The ID of the user. Can be null or undefined.
 * @param{String} state Data to be passed through the auth flow. Can be null or
 *                      undefined.
 * @return{String} The URL that initiates the OAuth flow.
 */
dmp.auth.createOAuthClientFlowUrl = function(clientId, scopes, userId, state) {
  // Suffix to force the reload of the page.
  var reloadSuffix = '';
  // Setting a reload suffix only for browsers that support URL re-write (The reload bug being in Chrome we are covered).
  if (window.history && window.history.replaceState) {
    reloadSuffix = '?oauth';
  }
  return "https://accounts.google.com/o/oauth2/auth?"
      + "redirect_uri=" + encodeURIComponent(location.protocol + '//'
                             + location.host + location.pathname + reloadSuffix)
      + "&response_type=token"
      + "&client_id=" + encodeURIComponent(clientId)
      + "&scope=" + encodeURIComponent(scopes)
      + (userId ? "&user_id=" + encodeURIComponent(userId) : "")
      + (state ? "&state=" + encodeURIComponent(state) : "");
};
