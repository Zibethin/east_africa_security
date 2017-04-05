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

    //Checking if Markers is an array of objects or a single object
    if (Object.prototype.toString.call(markers) === '[object Array]') {

        //if an array of objects then create a marker for each of them
        markers.forEach(function(d){
            d.marker = L.marker([d['#geo+lat'],d['#geo+lon']], { icon: myIcon })
            d.marker.on('click', function (e) {
                showIncident(d);
            })
            d.visible = false;
        })
    }
    else //if not an array then create a single marker
    {
        markers.marker = L.marker([markers['#geo+lat'],markers['#geo+lon']], { icon: myIcon })
        markers.marker.on('click', function (e) {
            showIncident(markers);
        })
        markers.visible = false;
    }
    return markers;
}

function DateAdd(date, type, amount){
    var y = date.getFullYear(),
        m = date.getMonth(),
        d = date.getDate();
    if(type === 'y'){
        y += amount;
    };
    if(type === 'm'){
        m += amount;
    };
    if(type === 'd'){
        d += amount;
    };
    return new Date(y, m, d);
}

function filterDateRange(date,days,data){

    var begin = DateAdd(date, 'd', -30)

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

function showIncident(d) {
    if(d['#meta+url']!=''){
        $('#headlines').html('<p><a id="back">Back</a></p><div class="titles"><span class="date">'+d['#date'].toISOString().substring(0, 10)+'</span> '+d['#event+title']+'</div><p>'+d['#event+description']+'</p><p><a href="'+d['#meta+url']+'" target="_blank">More info</a></p>');
    } else {
        $('#headlines').html('<p><a id="back">Back</a></p><div class="titles"><span class="date">'+d['#date'].toISOString().substring(0, 10)+'</span> '+d['#event+title']+'</div><p>'+d['#event+description']+'</p>');        
    }
    $('#back').on('click', function(){
        headlines(data);
    });
}

function headlines(data){
    $('#headlines').html('');
    data.forEach(function(d,i){
        if (d.visible) {
            $('#headlines').append('<div id="headline'+i+'" class="titles"><span class="date">'+d['#date'].toISOString().substring(0, 10)+'</span> '+d['#event+title']+'</div>');
        }
        $('#headline'+i).on('click',function(){
            map.setView([d['#geo+lat'],d['#geo+lon']], 8);
            showIncident(d);
        });
    });
}


// hxlProxyToJSON: reading hxl tags and setting them as keys for each event
// input is an array with hxl tags as first object, and then the data as objects
// output is an array with hxl tags as keys for the data objects

function hxlProxyToJSON(input){
    var output = [];
    var keys = []
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

//parseDates checks date is in the following format 2017-03-06 and is not before 1900 or beyond 2099
//and parses the date if the date is valid, if not it changes the date into undefined

function parseDates(tags, data) {
    var datePattern = new RegExp('(19|20)\\d\\d-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])');
    var parseDateFormat = d3.time.format("%Y-%m-%d").parse;
    data.forEach(function (d) {
        tags.forEach(function (t) {
            if (datePattern.test(d[t])) {
                d[t] = parseDateFormat(d[t]);
            } else {
                console.log("the following date is not valid: ", d[t]);
                d[t] = undefined;
            }
        })
    });

    data.sort(date_sort);
    return data;
}


function removeIncompletes(data){
    output = [];
    data.forEach(function (d) {
        if (!isNaN(d['#geo+lat']) && !isNaN(d['#geo+lon']) && (d['#date'] !== undefined) && d['#geo+lat'] <= 90 && d['#geo+lat'] >= -90 && d['#geo+lon'] >= -180 && d['#geo+lon'] <= 180) {
            output.push(d);
        }
    });
    return output;
}

var date_sort = function (d1, d2) {
    if (d1['#date'] < d2['#date']) return 1;
    if (d1['#date'] > d2['#date']) return -1;
    return 0;
};

var keyStatsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?force=on&filter01=clean&clean-num-tags01=%23geo&strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1uecK0OhCxMQmmWspuPoTvFL4o3xmfJVRrvE-wMUtQ_4/edit%23gid%3D0',
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
    data = filterDateRange(new Date(), 30, data);
    generateKeyStats(data);
});