$(function() {
	var choices = 2;

	function addField() {
		var nextIndex = $('#choices input').length;
		$('<input>').attr({
			'type': "text",
			name: "choices[" + nextIndex + "]",
			placeholder: 'Option'
		}).appendTo('#choices').focus();

		choices++;
	}
	function removeField(field) {
		var index = $(field).index();
		
		if(choices > 2) {
			if($(field).index() === choices-1) {
				$(field).prev().focus();
			} else {
				$(field).next().focus();
			}
			$(field).remove();

			var children = $('#choices input');
			for(var i=index; i<children.length; i++) {
				$(children[i]).attr({ name: "choices[" + i + "]" });
			}

			choices--;
		}
	}

	$('#addChoice').click(addField);

	$('#choices').on('keydown', function(e) {
		if(e.which == 38) {
			// up arrow
			$(document.activeElement).prev().focus();
			return false;
		} else if(e.which == 40) {
			// down arrow
			
			var index = $(e.target).index();

			if(index < choices-1) {
				$(document.activeElement).next().focus();
			} else {
				addField();
			}

			return false;
		} else if(e.which == 8 && ! $(e.target).val()) {
			// backspace
			
			removeField(e.target);

			return false;
		}
	});
});
