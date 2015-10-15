(function(ns) {
    var ID4 = ns.ID4 = {};
    ID4.readerName = "AAC";
    
    ID4.types = {
        '0'     : 'uint8',
        '1'     : 'text',
        '13'    : 'jpeg',
        '14'    : 'png',
        '21'    : 'uint8'
    };
    ID4.atom = {
        '©alb': ['album'],
        '©art': ['artist'],
        '©ART': ['artist'],
        'aART': ['artist'],
        '©day': ['year'],
        '©nam': ['title'],
        '©gen': ['genre'],
        '©wrt': ['composer'],
        '©too': ['encoder'],
        'cprt': ['copyright'],
        'covr': ['picture'],
        '©grp': ['grouping'],
        'keyw': ['keyword'],
        '©lyr': ['lyrics'],
        '©gen': ['genre']
    };

    ID4.loadData = function(data, callback) {
        // load the header of the first block
        callback(data);
    };

    ID4.readTagsFromData = function(data) {
        var tag = {};
        readAtom(tag, data, 0, data.byteLength);
        return tag;
    };

    function readAtom(tag, data, offset, length, indent) {
        indent = indent === undefined ? "" : indent + "  ";
        var seek = offset;
        while (seek < offset + length - 5) {
          var atomName = data.getString(4, seek);
          if (ID4.atom[atomName]) {
            var atomSize = data.getUint32(seek - 4, false);
            if (seek + atomSize > offset + length) {
              break;
            }
            var value;
            if (atomName == "covr") {
              var binary = '';
              for (var i = 0; i < atomSize - 24; i++) {
                  binary += String.fromCharCode(data.getUint8(seek + 20 + i) & 0xff);
              }
              value = window.btoa(binary);
              tag["mimetype"] = "image/jpeg";
            } else {
              value = data.getString(atomSize - 24, seek + 20, false, true);
            }
            console.log("Found tag: " + atomName + " - value: " + value);
            tag[ID4.atom[atomName][0]] = value.replace(/\0/g, "");
            seek += atomSize - 4;
          } else {
            seek += 1;
          }
        }
    }
    
    // Export functions for closure compiler
    ns["ID4"] = ns.ID4;
})(this);