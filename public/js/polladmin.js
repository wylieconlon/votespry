$(function() {
	console.log("Loaded");
	$('#closePoll').submit(function() {
		console.log("Submitting");
		var c = confirm("Are you sure you want to permanently close this poll?");
		return c;
	});
});
