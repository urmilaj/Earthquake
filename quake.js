function quakeViz() {

    //variables for svg width, height and padding.
    var padding = 25, mapWidth = 600, mapHeight = 400, graphWidth = 70000, graphHeight = 170;
    
    //create svg container for creating map and graph
        var svgMap = d3.select(".map svg")
               .append("g")
               .attr("class","map");

        var svgGraph = d3.select(".graph svg")
                 .append("g")
                 .attr("class","graph");
    
    //create the required d3 map projection
        var projection = d3.geoWagner()
                           .poleline(1)
                           .parallels(1)
                           .inflation(38)
                           .ratio(185)
                           .scale(108)
                           .translate([mapWidth/2,mapHeight/2.4])
                           
    //create the d3 geo path for display of the above map projection                      
        var path = d3.geoPath()
                     .projection(projection)
    
    //create the graticule 
        var graticule = d3.geoGraticule()

    //variable for parsing date string to date time object
        var parseTime = d3.timeParse("%d-%m-%Y");
    
    //variable d3 time scale to scale the date column of the data and helps to make the x-axis for graph.
        var xScale = d3.scaleTime()
               .range([padding, graphWidth-padding]);
    
    //variable d3 linear scale to scale the magnitude column of the data and helps to make y-axis for graph.
        var yScale = d3.scaleLinear()
               .range([graphHeight, 0]);
    
    //variable d3 square root scale to scale the radius of the circles on the map based on magnitude of the earthquake.
        var zScale = d3.scaleSqrt()
               .range([1,8]);
      
    //variable d3 square root scale to scale the radius of the circles on the graph based on magnitude of the earthquake.          
        var rScale = d3.scaleSqrt()
               .range([5, 15]);
    
    //variable for creating the x-axis of graph.
        var xAxis = d3.axisBottom()
                      .tickFormat(d3.timeFormat("%Y"))
                      .tickArguments([d3.timeYear]);
    
    //variable for creating the y-axis of graph.
        var yAxis = d3.axisLeft();
    
    //variable for draw/display the x-axis on the svg.
        var axisX= svgGraph.append("g")
                           .attr("transform", "translate(0,"+graphHeight+")");
    //variable for draw/display the y-axis on the svg.
        var axisY= svgGraph.append("g")
                           .attr("transform","translate("+padding+",0)");
    
    //d3 queue to load the map and graph svg at the same time. Parse csv data and convert string formats to date-time object and floats.
        d3.queue()
          .defer(d3.csv, "earthquakes 1900-2013.csv", function(d) {
              return {
                Year: d.Year, 
                Date: parseTime(d.Date),
                Magnitude: parseFloat(d.Magnitude),
                Longitude: parseFloat(d.Longitude),
                Latitude: parseFloat(d.Latitude),
                Place: d.Place
              }
          })
          .defer(d3.json, "50m.json")
          .awaitAll(initialize)
    
    //function for receiving the loaded graph and map data and create the visualization for the world map and graph.
        function initialize(error, results) {
            if (error) throw error
            var data = results[0]
            var world = results[1]

            worldMap(world)
            lollipopChart(data)
        }
    
    //function for creating the base world map visualization.
        function worldMap(world) {

            svgMap.append("defs")
            .append("path")
            .datum({type:"Sphere"})
            .attr("id", "sphere")
            .attr("d", path)
            
            svgMap.append("use")
            .attr("class", "stroke")
            .attr("xlink:href", "#sphere")
            
            svgMap.append("use")
            .attr("class", "fill")
            .attr("xlink:href", "#sphere")
        
            svgMap.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path)

            svgMap.insert("path", ".graticule")
               .datum(topojson.feature(world, world.objects.land))
               .attr("class", "land")
               .attr("d", path)

            svgMap.insert("path", ".graticule")
               .datum(topojson.mesh(world, world.objects.countries, function(a,b) {
                   return a !== b
               }))
               .attr("class", "boundary")
               .attr("d", path)

        }
    
    //function for creating the graph visualization.
        function lollipopChart(data) {

            var nest = d3.nest()
                         .key(d=>d.Year)
                         .entries(data)

            zScale.domain([d3.min(data, d=>d.Magnitude),d3.max(data,d=>d.Magnitude)])

            var quakes = svgMap.selectAll('quake')
                               .data(data)
                               .enter()
                               .append("circle")
                               .attr("class", "quake")
                               .attr("cx", d=> projection([d.Longitude, d.Latitude])[0])
                               .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
                               .attr("r", d=>zScale(d.Magnitude))

            xScale.domain([d3.min(nest,d=>d3.min(d.values,d=>d.Date)),d3.max(nest,d=>d3.max(d.values,d=>d.Date))])
            yScale.domain([d3.min(nest,d=>d3.min(d.values,d=>d.Magnitude)),d3.max(nest,d=>d3.max(d.values,d=>d.Magnitude))])
            rScale.domain([d3.min(nest,d=>d3.min(d.values,d=>d.Magnitude)), d3.max(nest, d=>d3.max(d.values,d=>d.Magnitude))])
            
            
            xAxis.scale(xScale)
            yAxis.scale(yScale)

            axisX.attr("class", "x-axis")
                     .call(xAxis)
    
            axisY.attr("class", "y-axis")
                     .call(yAxis)
                     

            var selectLineG = svgGraph.selectAll("lineG")
                                   .data(nest)
                                   .enter()
                                   .append("g")
                                   .attr("class","lineG")

            var line = selectLineG.selectAll("line")
                            .data(d=>d.values)
                            .enter()
                            .append("line")

            line.attr("x1", d=>xScale(d.Date))
                    .attr("y1", d=>yScale(d.Magnitude))
                    .attr("x2", d=>xScale(d.Date))
                    .attr("y2",graphHeight)
                    .attr("class", "line")

            var bubble = svgGraph.selectAll("bubble")
                                 .data(data)
                                 .enter()
                                 .append("circle")
                                 .attr("cx", d=>xScale(d.Date))
                                 .attr("cy", d=>yScale(d.Magnitude))
                                 .attr("r",d=>rScale(d.Magnitude))
                                 .attr("class", "bubble")

            //create the brush
            var brush = svgGraph.append("g")
                        .attr("class", "brush")
                        .call(d3.brush()
                        .extent([[0,0], [graphWidth, graphHeight+5]])
                        .on("brush", highlightedBubble)
                        .on("end",displayQuake))
            
            //function for the brush function
            function highlightedBubble() {
                if (d3.event.selection != null) {
                    bubble.attr("class", "nonBrush")
                    var brushCoordinate = d3.brushSelection(this)
                    bubble.filter(function() {
                        var cx = d3.select(this).attr("cx"),
                        cy = d3.select(this).attr("cy")
                        return isBrushed(brushCoordinate, cx, cy)
                        })
                .attr("class", "brushed")
                }}
            
            //function for displaying the earthquakes on the world map based on the brushed data on the graph.
            function displayQuake() {
                if (!d3.event.selection) return
                d3.select(this).on(brush.move, null)
                var d_brushed = d3.selectAll(".brushed").data()
                if (d_brushed.length>0) {
                    clearQuake()
                    populateQuake(d_brushed)} 
                    
                else {clearQuake()}}

        }
            
            //function for removing the quakes that are not being brushed.
            function clearQuake() {
                hideQuake()
                d3.selectAll(".circle").remove()
                }
            
            //function for the brush to collect the data of the circles if its currently under the brush.
            function isBrushed(brushCoordinate, cx, cy) {
                var x0 = brushCoordinate[0][0],
                x1 = brushCoordinate[1][0],
                y0 = brushCoordinate[0][1],
                y1 = brushCoordinate[1][1];
                
                return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;}
            
            //function for hiding the visibility of the circles that are not brushed.
            function hideQuake() {
                d3.select(".circle").style("visibility","hidden")
            }
            //function for showing the visibility of the circles that are being brushed.
            function showQuake() {
                d3.select(".circle").style("visibility","visible")
            }
            
            //function for displaying the earthquakes after it is brushed on the graph.
            function populateQuake(quakeCircles) {
                showQuake()
                rScale.domain([d3.min(quakeCircles, d=>d.Magnitude), d3.max(quakeCircles, d=>d.Magnitude)])
                var display = svgMap.selectAll('.quake')
                   .data(quakeCircles).raise()
                   .attr("class", "circle")
                   .attr("cx", d=> projection([d.Longitude, d.Latitude])[0])
                   .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
                   .attr("r", d=>rScale(d.Magnitude))


                   pulse(display)
                   
                   //function for making the earthquakes on the map to repeatedly pulse.
                   function pulse(display) {
                       (function repeat() {
                           display.transition()
                                  .duration(100)
                                  .attr("stroke-width", 0)
                                  .attr('stroke-opacity', 0)
                                  .transition()
                                  .duration(200)
                                  .attr("stroke-width", 0)
                                  .attr('stroke-opacity', 0.5)
                                  .transition()
                                  .duration(600)
                                  .attr("stroke-width", 25)
                                  .attr('stroke-opacity', 0)
                                  .ease(d3.easeSin)
                                  .on("end", repeat)
                       })()
                   }
                }

}