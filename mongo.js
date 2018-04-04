var mdb = require('mongodb');
var CONNECTION_STRING = 'mongodb://admin:admincitymeqrchecker@ds141108.mlab.com:41108/qrchecker';

var db = null;

module.exports = function(callback) {
    if (db) {
        callback && callback(db);
        return db;
    } else {
        mdb.MongoClient.connect(CONNECTION_STRING, function(err, _db) {
            if (err) {
                callback && callback();
            } else {
                db = _db;
                console.log('Connected to Mongodb');
                callback && callback(db);
            }
        });
    }
}