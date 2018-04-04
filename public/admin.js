function getScreen() {
	var hash = location.hash;

	var index = hash.indexOf('?');
	if (index>=0) {
		return hash.substring(0, index);
	}

	return hash;
}

function getQuery() {
	if (location.search) {
		return location.search;
	}
	else {
		var hash = location.hash;

		if (hash) {
			var index = hash.indexOf('?');
			if (index >= 0) {
				return hash.substring(index);
			}

			return '';
		}
		else {
			return location.search;
		}
	}
}

function preProcessTimes(times) {
	var group = {};
	var result = [];

	times.forEach(function(e) {
		var date = new Date(e.checkTime).toLocaleDateString();

		if (group[date]) {
			e.isDate = false;
			result.push(e);
		}
		else {
			group[date] = true;
			result.push({
				isDate: true,
				date: date
			});
			e.isDate = false;
			result.push(e);
		}
	});

	return result;
}

var data = {
	isLoading: true,
	times: [],
	employee: [],
	screen: getScreen() || '#employee',

	newEmployee: {
		id: '',
		name: '',
		avatar: '',
		hrcode: ''
	},
	selectMonth: (new Date().getMonth() + 1) + "",
	selectYear: (new Date().getFullYear()) + "",
	alert: ''
}

function queryHistory() {
	var month = parseInt(data.selectMonth);
	var year = parseInt(data.selectYear);
	var start = new Date(year, month - 1, 1, 0, 0, 1);
	var end = new Date(year, month, 0, 23, 59, 59);
	data.isLoading = true;
	var query = getQuery();
	query = query ? query + "&start=" + start.toISOString() + "&end=" + end.toISOString() 
		: '?' + "start=" + start.toISOString() + "&end=" + end.toISOString();
	$.get("api/history" + query, function(resdata, status) {
		var times = resdata.times;
		data.times = preProcessTimes(times);
		data.isLoading = false;
	});
}

$.get("api/employee", function(resdata, status) {
	data.employee = resdata;
	data.isLoading = false;
});

queryHistory();

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

var app = new Vue({
	el: '#app',
	data: data,
	methods: {
	changeDate: function() {
		queryHistory();
	},
	tabClick: function(name) {
		data.screen = name;
		if (name == '#history') {
			data.isLoading = true;
			queryHistory();
		}
		else {
			data.isLoading = true;
			$.get("api/employee", function(resdata, status) {
				data.employee = resdata;
				data.isLoading = false;
			});
		}
	},
	viewHistory: function(id) {
		location = "#history?id=" + id;
		data.screen = '#history';
		queryHistory();
	},
	deleteEmployee: function(id) {
		var res = confirm('Bạn chắc chắn muốn xóa. Sau khi đã xóa thì không thể khôi phục lại được!');
		if (res) {

			data.isLoading = true;
			$.post('api/del-employee', {
				id: id
			})
			.done(function(res) {
				data.isLoading = false;
				if (res.error) {
					data.alert = res.msg;
					$('.modal').modal('show');
				}
				else {
					data.employee = data.employee.filter(function(e) {
						return e.id != id;
					});
				}
			});
			
		}
	},
	addEmployee: function() {
		var hrcode = '';
		var find = null;
		while(true) {
			hrcode = getRandomInt(1000, 9999);

			find = data.employee.filter(function(e) {
				return e.hrcode == hrcode;
			});

			if (!find || find.length == 0) {
				break;
			}
		}

		find = data.employee.filter(function(e) {
			return e.id == data.newEmployee.id;
		});

		if (find && find.length > 0) {
			data.alert = "ID này đã tồn tại";
			$('.modal').modal('show');
			return;
		}

		var newEmp = {
			id: data.newEmployee.id,
			name: data.newEmployee.name,
			hrcode: hrcode,
			avatar: data.newEmployee.avatar
		}

		data.isLoading = true;
		$.post('api/employee', newEmp)
			.done(function(res) {
				data.isLoading = false;
				if (res.error) {
					data.alert = res.msg;
					$('.modal').modal('show');
				}
				else {
					data.employee.push(newEmp);
					data.newEmployee.id = '';
					data.newEmployee.name = '';
					data.newEmployee.hrcode = '';
					data.newEmployee.avatar = '';
				}
			});

	}
	}
})