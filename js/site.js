function generateKeyStats(data){
    numberOfIncidents(data);
}

function numberOfIncidents(data){
    var count=0;
    var begin = new Date();
    begin.setDate(begin.getDate()-30);
    data.forEach(function(d){
        if(d['#date']>begin){
            count++;
        } 
    });
    $('#numberofincidents').html(data.length);
}

function generateMap(){
    var baselayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {});

    map = L.map('map', {
        center: [20, 10],  //center: [43,20],
        zoom: 4,            //zoom: 5,
        layers: [baselayer]
    });
}

function clusterMarkers(markers) {
    for (var i = 0; i < markers.length; ++i) {
        //var popup = markers[i].name;
        markers[i].marker = L.marker([markers[i]['#geo+lat'], markers[i]['#geo+lon']], { icon: myIcon })
                .on('mouseover', function (e) {
                    showIncident(markers);
                });
                        //.bindPopup(popup);
        markers[i].visible = false;
    }
    return markers;
}

function filterDateRange(date,days,data){

    var begin = new Date();
    begin.setDate(date.getDate()-days);

    data.forEach(function (d) {
        if (d['#date']>=begin&&d['#date']<=date) {
            if (!d.visible) {
                d = clusterMarkers(d);
                markerClusters.addLayer(d.marker);
                markerClusters.addTo(map);
                d.visible = true;
            }
        } else {
            if (d.visible) {
                map.removeLayer(d.marker);
                markerClusters.removeLayer(d.marker);
                d.visible = false;
            }
        }
    }
    );

    headlines(data);

    return data;
};

function addSlider(data){
    var max = new Date();
    var min = d3.min(data,function(d){
        return d['#date'];
    });
    $('#slider').html('<span id="sliderdate">'+max.toISOString().substring(0, 10)+'</span><input id="dateslider" type="range" min="'+min.valueOf()+'" max="'+max.valueOf()+'" step="86400000"  value="'+max.valueOf()+'" /><p>Showing 30 days previous</p>');
    
    $('#dateslider').on("input", function() {
        var mill = parseInt($('#dateslider').val());
        var date = new Date(mill);
        $('#sliderdate').html(date.toISOString().substring(0, 10));
    });

    $('#dateslider').on("change", function(){
        var mill = parseInt($('#dateslider').val());
        var date = new Date(mill);
        data = filterDateRange(date,30,data);
    });
}

function showIncident(d){
    $('#headlines').html('<p><a id="back">Back</a></p><div class="titles"><span class="date">'+d['#date'].toISOString().substring(0, 10)+'</span> '+d['#event+title']+'</div><p>'+d['#event+description']+'</p><p><a href="'+d['#meta+url']+'">Website</a></p>');
    $('#back').on('click',function(){
        headlines(data);
    });
}

function headlines(data){
    $('#headlines').html('');
    data.forEach(function(d,i){
        if(d.visible){
            $('#headlines').append('<div id="headline'+i+'" class="titles"><span class="date">'+d['#date'].toISOString().substring(0, 10)+'</span> '+d['#event+title']+'</div>');
        }
        $('#headline'+i).on('click',function(){
            map.setView([d['#geo+lat'],d['#geo+lon']], 8);
            showIncident(d);
        });
    });
}

function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function parseDates(tags,data){
    var parseDateFormat = d3.time.format("%Y-%m-%d").parse;
    data.forEach(function(d){
        tags.forEach(function(t){
            d[t] = parseDateFormat(d[t]);
        });
    });

    data.sort(date_sort);
    return data;
}

function removeIncompletes(data){
    output = [];
    data.forEach(function(d){
        if(!isNaN(d['#geo+lat']) && !isNaN(d['#geo+lat'])){
            output.push(d);
        }
    });
    return data;
}

var date_sort = function (d1, d2) {
    if (d1['#date'] < d2['#date']) return 1;
    if (d1['#date'] > d2['#date']) return -1;
    return 0;
};

var keyStatsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?filter01=clean&clean-date-tags01=%23date&strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1uecK0OhCxMQmmWspuPoTvFL4o3xmfJVRrvE-wMUtQ_4/edit%3Fusp%3Dsharing&clean-num-tags01=%23geo',
    dataType: 'json',
});

var map, data;

var myIcon = L.icon({
    iconUrl: 'img/pin@1x.svg',
    iconSize: [60, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -14]
});

var markerClusters = L.markerClusterGroup();


generateMap();

$.when(keyStatsCall).then(function(keyStatsArgs){
    data = parseDates(['#date'],(hxlProxyToJSON(keyStatsArgs)));
    data = removeIncompletes(data);
    addSlider(data);
    data = clusterMarkers(data);
    data = filterDateRange(new Date(),30,data);
    generateKeyStats(data);
});