function insertItem(checker) {
	var template = $('template#item').html();
	template = template.replace('{{ marginTop }}', -70);
	template = template.replace('{{ name }}', checker.name);
	template = template.replace('{{ time }}', new Date(checker.checkTime).toLocaleTimeString());
	template = template.replace('{{ avatar }}', checker.avatar);
	template = template.replace('{{ id }}', checker.checkTime + checker.type + checker.employee +checker._id);
	template = template.replace('{{ type }}', checker.type == 'in' ? '#4CAF50' : '#e91e63');
	$(document).scrollTop(0);
	var li = $('#app ul').prepend(template);
	setTimeout(function() {
		var li = $('#app ul li#' + checker.checkTime + checker.type + checker.employee + checker._id)[0];
		if (li) {
			li.style.marginTop = 0;
			li.style.opacity = 1;
		}
	}, 50);

	setTimeout(function() {
		var li = $('#app ul li#' + checker.checkTime + checker.type + checker.employee +checker._id)[0];
		if (li) {
			li.style['z-index'] = 1;
		}
	}, 1000);

}

$.get("api/config", function(resdata, status) {
	resdata.message && $('.message').html(resdata.message);
	if (resdata.img_waiting && $('#app ul').children().length == 0) {
		$('.waiting-img')[0].src = resdata.img_waiting;
	}
});

$.get("api/today", function(resdata, status) {
	var times = resdata.times;

	for (var i = times.length - 1; i >= 0; i--) {
		insertItem(times[i], i);
	}

	if (times.length > 0) {
		$('.waiting-img').hide();
	} 
});

var socket = io();

socket.on('new-checker', function(checker) {
	insertItem(checker, i);
	$('.waiting-img').hide();
});

// //QR
var height = Math.round($(document).height() - 320);
var width = Math.round($(document).width() / 3);
var size = width > height ? height : width;
size = Math.round(size);
var qrcode = new QRCode("qrcode", {
	width: size,
	height: size
});
qrcode.makeCode('' + new Date().getTime());
setInterval(function() {
	$.get('api/code', function(resdata) {
		qrcode.clear();
		qrcode.makeCode(resdata);
	})
}, 5000);