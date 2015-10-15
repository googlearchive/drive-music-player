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

/*
 * Adding btoa to window for IE
 */
if (!window.btoa) {
  window.btoa = function(vValue) {
    var aBase64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .split('');
    var aValue = [], sValue = vValue;
    for ( var nIndex = 0, nLength = sValue.length, nValue1, nValue2, nValue3; nIndex < nLength;) {
      nValue1 = sValue.charCodeAt(nIndex++) & 255;
      if (nIndex == nLength) {
        aValue.push(aBase64EncodeChars[nValue1 >> 2]);
        aValue.push(aBase64EncodeChars[(nValue1 & 3) << 4]);
        aValue.push('==');
        break;
      }
      nValue2 = sValue.charCodeAt(nIndex++);
      if (nIndex == nLength) {
        aValue.push(aBase64EncodeChars[nValue1 >> 2]);
        aValue.push(aBase64EncodeChars[((nValue1 & 3) << 4)
            | ((nValue2 & 240) >> 4)]);
        aValue.push(aBase64EncodeChars[(nValue2 & 15) << 2]);
        aValue.push('=');
        break;
      }
      nValue3 = sValue.charCodeAt(nIndex++);
      aValue.push(aBase64EncodeChars[nValue1 >> 2]);
      aValue.push(aBase64EncodeChars[((nValue1 & 3) << 4)
          | ((nValue2 & 240) >> 4)]);
      aValue.push(aBase64EncodeChars[((nValue2 & 15) << 2)
          | ((nValue3 & 192) >> 6)]);
      aValue.push(aBase64EncodeChars[nValue3 & 63]);
    }
    return aValue.join('');
  };
};
