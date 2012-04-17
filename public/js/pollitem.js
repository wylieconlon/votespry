$(function() {
	
	var code = $('#chart').attr('data-code');
	
	var dataURL = '/poll/'+code+'/data.json';

	var chart = new Highcharts.Chart({
			chart: {
				renderTo: 'chart',
				type: 'column',
				plotBorderWidth: 1,
				animation: {
					duration: 100
				},
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
						fontFamily: 'Arial, Helvetica, sans-serif',
						fontSize: '16px',
						color: '#000'
					}
				},
				lineWidth: 0,
				//tickLength: 0,
				tickPosition: 'inside'
			},

			yAxis: {
				title: {
					text: null
				},
				min: 0,
				allowDecimals: false,
				minRange: 2
			},

			legend: {
					enabled: false
			},

			series: [{
				name: "Votes"
			}]
	});
});
