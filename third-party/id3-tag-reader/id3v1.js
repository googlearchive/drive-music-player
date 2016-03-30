/*
 * JavaScript ID3 Tag Reader 0.1.2
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 *
 * Extended by António Afonso (antonio.afonso@opera.com), Opera Software ASA
 * Modified by António Afonso (antonio.afonso@gmail.com)
 * Modified by Nicolas Garnier (nivco.las@gmail.com)
 */

(function(ns) {
    var ID3v1 = ns.ID3v1 = {};
    ID3v1.readerName = "ID3 v1";
    var genres = [
    	"Blues","Classic Rock","Country","Dance","Disco","Funk","Grunge",
    	"Hip-Hop","Jazz","Metal","New Age","Oldies","Other","Pop","R&B",
    	"Rap","Reggae","Rock","Techno","Industrial","Alternative","Ska",
    	"Death Metal","Pranks","Soundtrack","Euro-Techno","Ambient",
    	"Trip-Hop","Vocal","Jazz+Funk","Fusion","Trance","Classical",
    	"Instrumental","Acid","House","Game","Sound Clip","Gospel",
    	"Noise","AlternRock","Bass","Soul","Punk","Space","Meditative",
    	"Instrumental Pop","Instrumental Rock","Ethnic","Gothic",
    	"Darkwave","Techno-Industrial","Electronic","Pop-Folk",
    	"Eurodance","Dream","Southern Rock","Comedy","Cult","Gangsta",
    	"Top 40","Christian Rap","Pop/Funk","Jungle","Native American",
    	"Cabaret","New Wave","Psychadelic","Rave","Showtunes","Trailer",
    	"Lo-Fi","Tribal","Acid Punk","Acid Jazz","Polka","Retro",
    	"Musical","Rock & Roll","Hard Rock","Folk","Folk-Rock",
    	"National Folk","Swing","Fast Fusion","Bebob","Latin","Revival",
    	"Celtic","Bluegrass","Avantgarde","Gothic Rock","Progressive Rock",
    	"Psychedelic Rock","Symphonic Rock","Slow Rock","Big Band",
    	"Chorus","Easy Listening","Acoustic","Humour","Speech","Chanson",
    	"Opera","Chamber Music","Sonata","Symphony","Booty Bass","Primus",
    	"Porn Groove","Satire","Slow Jam","Club","Tango","Samba",
    	"Folklore","Ballad","Power Ballad","Rhythmic Soul","Freestyle",
    	"Duet","Punk Rock","Drum Solo","Acapella","Euro-House","Dance Hall"
    ];

    ID3v1.loadData = function(data, callback, url) {
      $.ajax({
        url: url,
        tryCount : 0,
        retryLimit : 2,
        headers: {"Range": "bytes=-128"},
        success: function(data) {
          data = new jDataView(data, 0, data.length, false);
          if (callback) {
            callback(data);
          }
        },
        error: function() {
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

    ID3v1.readTagsFromData = function(data) {
      if (!data) {
        return;
      }
    	var offset = 0;
    	var header = data.getString(3, offset);
    	if (header == "TAG") {
    		var title = data.getString(30, offset + 3).replace(/\0/g, "");
    		var artist = data.getString(30, offset + 33).replace(/\0/g, "");
    		var album = data.getString(30, offset + 63).replace(/\0/g, "");
    		var year = data.getString(4, offset + 93).replace(/\0/g, "");
    		var comment = "";
                var track = 0;

    		var trackFlag = data.getUint8(offset + 97 + 28);
    		if (trackFlag == 0) {
    			comment = data.getString(28, offset + 97).replace(/\0/g, "");
    			track = data.getUint8(offset + 97 + 29);
    		}

    		var genreIdx = data.getUint8(offset + 97 + 30);
                var genre = "";
    		if (genreIdx < 255) {
    			genre = genres[genreIdx];
    		}

    		return {
    		  "version" : '1.1',
    			"title" : title,
    			"artist" : artist,
    			"album" : album,
    			"year" : year,
    			"comment" : comment,
    			"track" : track,
    			"genre" : genre
    		};
    	} else {
    		return {};
    	}
    };

    // Export functions for closure compiler
    ns["ID3v1"] = ns.ID3v1;

})(this);
