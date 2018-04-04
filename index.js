var bodyParser = require('body-parser')
var express = require('express');
var socketIO = require('socket.io');

var mongo = require('./mongo');

mongo();

var auth = require('http-auth');
var basic = auth.basic({
        realm: "Simon Area."
    }, (username, password, callback) => { 
        callback(username === "linhmai" && password === "linhsieumau");
    }
);

var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser());
app.set('views', './views');
app.use('/', express.static('./public'));

app.get('/', function(req, res) {
	res.render('index.ejs');
});

app.use('/admin', auth.connect(basic));
app.use('/api/employee', auth.connect(basic));
app.use('/api/del-employee', auth.connect(basic));
app.get('/admin', function(req, res) {
	res.render('admin.ejs');
});

app.get('/api/employee', function(req, res) {
	var Employee = mongo().collection('employee');
	Employee
		.find({})
		.sort({id: 1})
		.toArray(function(err, data) {
			if (err) {
				res.send([])
			}
			else {
				res.send(data)
			}
		})
})

app.post('/api/employee', function(req, res) {
	var Employee = mongo().collection('employee');
	Employee.insert(req.body, function(err, data) {
		if (err) {
			res.send({
				error: true,
				msg: 'Không thêm được nhân viên mới'
			})
		}
		else {
			res.send({
				error: false
			});
		}
	})
});

app.post('/api/del-employee', function(req, res) {
	var Employee = mongo().collection('employee');
	Employee.remove({
		id: req.body.id
	}, function(err, data) {
		if (err) {
			res.send({
				error: true,
				msg: 'Không xóa được nhân viên'
			})
		}
		else {
			res.send({
				error: false
			});
		}
	})
});

function genCode() {
	return (new Date().getTime() * 19191) + '';
}

function decode(code) {

	return parseInt(code) / 19191;
}

app.get('/api/code', function(req, res) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip == '27.72.57.23' || ip == '::1') {
		res.send(genCode());
	}
	else {
		res.send('what do you want?')
	}
});

app.get('/api/check', function(req, res) {
	var id = req.query.id;
	var code = req.query.code;
	var type = req.query.type;

	if (!id) {
		res.send({
			error: true,
			msg: 'Vui lòng đăng nhập'
		});
		return;
	}

	if (!code) {
		res.send({
			error: true,
			msg: 'Vui lòng quét mã QR để check'
		});
		return;
	}

	if (!type) {
		res.send({
			error: true,
			msg: 'Vui lòng chọn check-in hoặc check-out'
		});
		return;
	}

	var time = decode(code);

	var currentTime = new Date().getTime();

	if (currentTime - time > 10000) {
		res.send({
			error: true,
			msg: 'QR đã hết bạn'
		});

		return;
	}

	var Employee = mongo().collection('employee');
	Employee.findOne({
		id: id
	}, function(err, emp) {
		if (err || !emp) {
			res.send({
				error: true,
				msg: 'Không check-' + type + ' được (db)'
			});
		}
		else {
			var newChecker = {
				name: emp.name,
				employee: emp.id,
				avatar: emp.avatar,
				checkTime: time,
				type: type
			};
			var TimeLine = mongo().collection('timeline');
			TimeLine.insert(newChecker, function(err) {
				if (err) {
					res.send({
						error: true,
						msg: 'Không check-' + type + ' được (db)'
					});
				}
				else {
					io.emit('new-checker', newChecker);
					res.send({
						error: false,
						msg: type == 'in' ? 'Xin chào ' + emp.name : 'Tạm biệt ' + emp.name
					});
				}
			})
		}
	})
});

app.get('/api/config', function(req, res) {
	var Config = mongo().collection('config');
	Config.findOne({}, function(err, mes) {
		if (err || !mes) {
			res.send({
				message: 'Đi làm đúng giờ để bảo vệ tổ quốc, check ngay!'
			});
		}
		else {
			res.send(mes);
		}
	})
});

app.get('/api/today', function(req, res) {
	var start = new Date();
	start.setHours(0,0,0,0);
	var end = new Date();
	end.setHours(23,59,59,999);

	start = start.getTime();
	end = end.getTime();

	var TimeLine = mongo().collection('timeline');

	TimeLine.find({
		$and: [{ checkTime: { $gte: start} },
			{ checkTime: { $lte: end }}
		]
	})
	.sort({
		checkTime: -1
	}).toArray(function(err, times) {
		if (err) {
			res.send({
				start: start,
				end: end,
				times: []
			})
		}
		else {
			res.send({
				start: start,
				end: end,
				times: times
			})
		}
	})
});

app.get('/api/history', function(req, res) {

	var start = req.query.start;
	var end = req.query.end;
	var id = req.query.id;

	if (start) {
		start = new Date(start);
		start = start.getTime();
	}

	if (end) {
		end = new Date(end);
		end = end.getTime();
	}

	var query = {

	}

	if (start && end) {
		query.$and = [{ checkTime: { $gte: start} },
			{ checkTime: { $lte: end }}
		]
	}
	else if (start) {
		query.checkTime = {
			$gte: start
		}
	}
	else if (end) {
		query.checkTime = {
			$lte: end
		}
	}


	if (id) {
		query.employee = id;
	}

	var TimeLine = mongo().collection('timeline');

	TimeLine.find(query)
	.sort({
		checkTime: -1
	}).toArray(function(err, times) {
		if (err) {
			res.send({
				start: start,
				end: end,
				times: []
			})
		}
		else {
			res.send({
				start: start,
				end: end,
				times: times
			})
		}
	})
});

app.get('/api/login', function(req, res) {
	var hrcode = req.query.hrcode || '';
	hrcode = hrcode.trim();
	if (!hrcode) {
		res.send({
			error: true,
			msg: 'Nhập mã đăng nhập'
		});
	}
	else {
		var Employee = mongo().collection('employee');
		Employee.findOne({
			hrcode: hrcode
		}, function(err, emp) {
			if (err) {
				res.send({
					error: true,
					msg: 'Có lỗi'
				});
			}
			else if (!emp) {
				res.send({
					error: true,
					msg: 'Mã đăng nhập không đúng'
				});
			}
			else {
				res.send({
					error: false,
					employee: emp
				})
			}
		});
	}
});

app.get('/v', function(req, res) {
	res.send('v1.0')
});

var server = app.listen(process.env.PORT || 3300, function() {
	console.log('port: 3300');
});

var io = socketIO(server);

io.on('connection', function(socket){
  socket.on('disconnect', function(){
  });
});