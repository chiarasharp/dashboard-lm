global = {
	parsedData : [],
	fileNames : [],
    grid : undefined,
    gridItems : [],
    gridItemsLength : 0
}
  

$(document).ready(function(){

    loadData().then(function() {
        loadFileList();
    });

    loadGridItems();


    $('form').submit(function(event) { // catch the form's submit event

        event.preventDefault();

        $('#submitButton').addClass('loading');
        document.getElementById("fileList").style.display = "none";
        document.getElementById("noItems").style.display = "none";
        document.getElementById("loadingItems").style.display = "block";

        $.ajax({ // AJAX call
            data: new FormData($('form')[0]), // get the form data
            type: $(this).attr('method'), // GET or POST
            url: $(this).attr('action'), // the file to call
            contentType: false,
            processData: false,

            success: function(response) {

                loadData().then(function() {
                    document.getElementById("fileInput").value = "";
                    $('#submitButton').removeClass('loading');
                    loadFileList();
                    
                    alert(response.message);
                }
                );
                
            },
            error: function(error) {
                document.getElementById("fileInput").value = "";
                $('#submitButton').removeClass('loading');
                loadFileList();
                alert(error.message);
            }
        });

       
    });

    $('#addChart').click(function(event) {
        loadQueries().then(function() {
            var yearCount = {};
            global.parsedData.forEach(item => {
                queryArt = item.parsedData.queriesData[0].queryResult;
                queryDate = item.parsedData.queriesData[1].queryResult;
                queryYear = new Date(queryDate).getFullYear();
    
                if(yearCount.hasOwnProperty(queryYear)) {
                    yearCount[queryYear] = yearCount[queryYear] + queryArt;
                }
                else {
                    yearCount[queryYear] = queryArt;
                } 
            })
            createChartArticlesInYears(yearCount);
            console.log(yearCount);
        });  
	});

})

function loadData() {
	return $.ajax({
	    url: 'pull',
	    type: 'GET',
	    contentType: "application/json",

	    success: function(data) {
            global.fileNames = data.fileNames;
            global.parsedData = data.parsedData;
	    },
        error: function(error) {
            alert(error.message);
        }
	});
}

function loadFileList() {
    var fileList = $('#fileList');
	fileList.html("");

    if (global.fileNames.length == 0) {
        document.getElementById("loadingItems").style.display = "none";
        document.getElementById("noItems").style.display = "block";
    }
    else {
        global.fileNames.forEach((file) => {
            fileList.append(`
                <div class="item" tag="${file}">
                    <div class="content">
                        <div class="description">${file}</div>
                    </div>
                </div>`);
        });

        document.getElementById("noItems").style.display = "none";
        document.getElementById("loadingItems").style.display = "none";
        document.getElementById("fileList").style.display = "block";
    }
}

function getQueriesDataLength(fileName) {
    var res = null;

    global.parsedData.forEach((item) => {
        if (item.fileName == fileName) {
            res = item.parsedData.queriesData.length;
            return res;
        }
    });

    return res;
}

function loadQueries() {
    return queriesFiles(['count(//*[local-name()="article"])','string(//*[local-name()="publication"]/@date)'], 'xpath');
}

function queryFileAndParseResult(fileName, query, queryLang, numQuery) {
    $.ajax({
	    url: '/query-and-parse',
	    type: 'POST',
        data: {
            fileName: fileName,
            query: query,
            queryLang: queryLang,
            numQuery: numQuery
        },

	    success: function(data) {
            global.parsedData.forEach((item) => {
                if (item.fileName == fileName) {
                    queryData = {
                        queryName : data.parsedQuery.fileName,
                        queryFormat : queryLang,
                        query: query,
                        queryResult : data.parsedQuery.fileContent,
                        queryParsed : data.parsedQuery.parsedData
                    }

                    item.parsedData.queriesData.push(queryData);  
                }
            })  
	    },
        error: function(error) {
            alert(error);
        }
	});

    return res;
}

function queryFile(fileName, query, queryLang, numQuery) {
    $.ajax({
	    url: 'query',
	    type: 'POST',
        data: {
            fileName: fileName,
            query: query,
            queryLang: queryLang,
            numQuery: numQuery
        },

	    success: function(data) {
            global.parsedData.forEach((item) => {
                if (item.fileName == fileName) {
                    queryData = {
                        queryName : data.queryResult.queryName,
                        queryLang : queryLang,
                        query: query,
                        queryResult : data.queryResult.queryResult
                    }

                    item.parsedData.queriesData.push(queryData);
                }
            })
	    },
        error: function(error) {
            alert(error);
        }
	});
}

function queriesFiles(queries, queryLang) {
    return $.ajax({
	    url: 'queries',
	    type: 'POST',
        data: {
            queries: queries,
            queryLang: queryLang
        },

	    success: function(data) {
            global.parsedData.forEach((item) => {
                const queriesItem = [];

                data.queriesResult.forEach((queryRes) => {
                    if (item.fileName == queryRes.fileName) {
                        queriesItem.push(queryRes);
                    }
                });

                queriesItem.forEach((query) => {
                    queryData = {
                        queryName : query.queryName,
                        queryLang : queryLang,
                        query: queries[query.counterQuery],
                        queryResult : query.queryResult
                    }
                
                    item.parsedData.queriesData.push(queryData);
                });            
            })
	    },
        error: function(error) {
            alert(error);
        }
	});
}

function addItem(chartName) {
    let item = {
        x: 0, 
        y: 0, 
        width: 5, 
        height: 5,
        noResize: true, 
        content: '<div style="padding-top:0px;padding-right:20px;padding-bottom:20px;padding-left:10px;"><canvas id="'+chartName+'"></canvas></div>'
    }
    
    //items.push(item);
    global.gridItemsLength++;
    global.grid.addWidget('<div><div class="grid-stack-item-content"><button class="ui button" id="dlt'+chartName+'"onClick="global.grid.removeWidget(this.parentNode.parentNode)">Delete Chart</button><br>' + (item.content ? item.content : ''), item);
}

function loadGridItems() {
    global.grid = GridStack.init({
        acceptWidgets: true,
        float: true
    });

    global.grid.load(global.gridItems);
  
    global.grid.on('added change', function(e, items) {
        let str = '';
        items.forEach(function(item) { str += ' (x,y)=' + item.x + ',' + item.y; });

        console.log(e.type + ' ' + items.length + ' items:' + str );
    });

    global.grid.on('removed', function(e, items) {
        let str = '';
        items.forEach(function(item) { str += ' (x,y)=' + item.x + ',' + item.y; });
        global.gridItemsLength--;
        console.log(e.type + ' ' + items.length + ' items:' + str );
    });
}

function createChartArticlesInYears(articlesInYears) {
    var chartName = 'Canvas'+ global.gridItemsLength;
    addItem(chartName);
    console.log(chartName);
    var context = document.getElementById(chartName).getContext('2d');
		
    var chart = new Chart(context, {
        type: 'bar',
        data: {
            labels: Object.keys(articlesInYears),
            datasets: [{
                label: 'Number of articles by year.',
                data: Object.values(articlesInYears),
                fill: false,
            }]
        }
    });
        
}