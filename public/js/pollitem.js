$(function() {
	
	var code = $('#chart').attr('data-code');
	
	var dataURL = '/poll/'+code+'/data.json';

	var chart = new Highcharts.Chart({
			chart: {
				renderTo: 'chart',
				type: 'column',
				events: {
					load: function() {
						var that = this;
						
						var getData = function() {
								$.getJSON(dataURL, function(data) {
										that.xAxis[0].setCategories(data.keys);
										that.series[0].setData(data.votes);
								});
						}
						
						getData();
						
						window.timer = setInterval(getData, 5000);
					}
				}
			},

			title: {
				text: null
			},
			
			xAxis: {
				labels: {
					style: {
						font: 'normal 16px Arial, Helvetica, sans-serif',
						color: '#000'
					}
				}
			},

			yAxis: {
				title: {
					text: "Votes"
				},
				min: 0,
				allowDecimals: false,
				minRange: 2
			},

			legend: {
					enabled: false
			},

			series: [{
				name: "Test"
			}]
	});
});
