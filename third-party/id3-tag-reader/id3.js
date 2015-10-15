(function(ns) {
    var ID3 = ns.ID3 = {};
    
    var _files = {};
    
    /**
     * Finds out the tag format of this data and returns the appropriate
     * reader.
     */
    function getTagReader(data) {
        // FIXME: improve this detection according to the spec      
        return data.getString(7, 4) == "ftypM4A" ? ID4 :
               (data.getString(3, 0) == "ID3" ? ID3v2 : ID3v1);
    }
    
    function readTags(reader, data, url) {
        var tagsFound = reader.readTagsFromData(data);
        var tags = _files[url] || {};
        for( var tag in tagsFound ) if( tagsFound.hasOwnProperty(tag) ) {
            tags[tag] = tagsFound[tag];
        }
        _files[url] = tags;
    }

    /**
     * @param {string} url The location of the sound file to read.
     * @param {function()} callback The callback function to be invoked when all tags have been read.
     * @param {{tags: Array.<string>, dataReader: function(string, function(BinaryReader))}} options The set of options that can specify the tags to be read and the dataReader to use in order to read the file located at url.
     */
    ID3.loadTags = function(url, callback) {
      jQuery.support.cors = true;
      $.ajax({
        url: url,
        crossDomain: true,
        dataType: 'text',
        tryCount : 0,
        retryLimit : 2,
        headers: {
          "Range": "bytes=0-400000",
          "Accept": "text/plain; charset=x-user-defined"},
        success: function(data) {
          try {
            data = new jDataView(data, 0, data.length, false);
            var reader = getTagReader(data);
            console.log("Found ID tag type. Using reader: " + reader.readerName);
            reader.loadData(data, function(newData) {
                readTags(reader, newData, url);
                if (callback) {
                  callback();
                }
            }, url);
          } catch(e) {
            if (callback) {
              console.log(e);
              callback();
            }
          }
        },
        error: function(e) {
          console.log(e);
          this.tryCount++;
          if (this.tryCount <= this.retryLimit) {
              //try again
              $.ajax(this);
              return;
          } else {
            if (callback) {
              callback();
            }            
          }            
          return;
        }
      });
    };

    ID3.getAllTags = function(url) {
        if (!_files[url]) return null;
        
        var tags = {};
        for (var a in _files[url]) {
            if (_files[url].hasOwnProperty(a))
                tags[a] = _files[url][a];
        }
        return tags;
    };

    ID3.getTag = function(url, tag) {
        if (!_files[url]) return null;

        return _files[url][tag];
    };
    
    // Export functions for closure compiler
    ns["ID3"] = ns.ID3;
    ID3["loadTags"] = ID3.loadTags;
    ID3["getAllTags"] = ID3.getAllTags;
    ID3["getTag"] = ID3.getTag;
})(this);