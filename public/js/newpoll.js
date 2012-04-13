$(function() {
	$('#addChoice').click(function(e) {
		var nextIndex = $('#choices input').length;
		$('#choices').append($('<input>').attr({
			'type': "text",
			name: "choices[" + nextIndex + "]"
		}));
	});
});
