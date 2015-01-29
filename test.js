//var track_code = "RB001247592SG"
var allUpdates = {};

Object.observe(allUpdates, function(changes) {
	changes.forEach(function(change){
		
		var changed = change.object[change.name];
		if (change.type == 'delete') {
			updateAll()
		}
		addHeader(changed.code)
		for( i in changed.updates) {
			changed.updates[i] = drawRow(changed.updates[i])
			console.log(changed.updates[i])
		}
	})
})

function updateAll() { 
	$("#updatesTable").empty();
	setTimeout(function(){applyOnStoredCodes(function(codes) { for(i in codes) fetchTrackCodeUpdates(codes[i]); })}, 100);
}

function applyOnStoredCodes(processTrackCodesFunction) {
	chrome.storage.local.get('codes', function(result){
		var obj = result || {codes: []};
		processTrackCodesFunction(obj.codes);
	})
}

function addHeader(code) {
	var row = $("<tr />")
	row.append($("<td colspan=4 class='trackCode'>" + code + "</td>"));
	$("#updatesTable").append(row); 
	row.click(function(evt) {
		var codeDeleted = this.children[0].innerHTML;
		delete allUpdates[codeDeleted]
		applyOnStoredCodes(function(codes) { 
			codes.splice(codes.indexOf(codeDeleted),1)
			chrome.storage.local.set({'codes': codes});
		});
	});
	return row;
}

function cleanHtmlInput(htmlInput) {
	var tableOnly = htmlInput.substring('<TABLE>', html.indexOf('</TABLE>'))
	return tableOnly.replace(/<.*?>/g,' ')
}

function exctract(string, s, e) {
	var ret = ''
	if (e == null)
		ret = string.substring(string.indexOf(s), string.indexOf('</TABLE>'))
	else
		ret = string.substring(string.indexOf(s), string.indexOf(e))
	return ret.replace(/<.*?>/g,' ')
}

function extractData(a) {
	var update = {}
	update.date = (a.substring(0,16).trim())
	update.location = (a.substring(16, a.indexOf('\n')).replace(/\w+\s*$/, '').trim())
	update.status = (a.substring(16, a.indexOf('\n')).trim().split(' ').pop())	
	update.obs = (a.substring(a.indexOf('\n')).trim())
	return update
}

function informUpdatesFor(track_code, updates) {
	allUpdates[track_code] = { code: track_code, updates: updates };
}

function drawRow(rowData) {
    var row = $("<tr />")
    
    $("#updatesTable").append(row); 
    row.append($("<td>" + rowData.date + "</td>"));
    row.append($("<td>" + rowData.location + "</td>"));
    row.append($("<td>" + rowData.status + "</td>"));
    row.append($("<td>" + rowData.obs + "</td>"));
    rowData.rowElement = row
    return rowData
}

function fetchTrackCodeUpdates(track_code){
	console.log('fetching for ' + track_code)
	var form = new FormData()
	form.append("P_COD_UNI", track_code);form.append("Z_START","1");form.append("P_ITEMCODE",track_code);form.append("P_TIPO","001");form.append("P_LINGUA","001")
	var mypostrequest = new XMLHttpRequest()
	mypostrequest.open("POST", "http://websro.correios.com.br/sro_bin/txect01$.QueryList", true)
	
	mypostrequest.onload = function(e) {
		var resp = mypostrequest.response
		
		var datesRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/mg
		
		var date = datesRegex.exec(resp)
		var updates = []
		while (date != null) {
			var nextDate = datesRegex.exec(resp)
			updates.push(extractData(exctract(resp,date,nextDate)))
			date = nextDate
		}
		if (updates.length == 0) {
			var na = '---'
			updates.push({
				date: na,
				location: na,
				status: na,
				obs: na
			})
		}
		informUpdatesFor(track_code, updates)
	}
	mypostrequest.send(form)
}

$(function() {
	
	
	updateAll();

	$('#refreshButton').click(function(evt) {
		updateAll();
	})
	$('#addButton').click(function(evt) {
		applyOnStoredCodes(function(codes) {
			var newCode = $('#trackCode')[0].value;
			if (codes.indexOf(newCode) > -1) return;
			codes.push(newCode)
			chrome.storage.local.set({'codes': codes}, function() {
				$('#trackCode')[0].value = '';
				updateAll();
        	});
		});
	});
	
	
})