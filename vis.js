

GRID_WIDTH_SINGLE = 120

GRID_WIDTH_GROUP_ITEM = 200
GRID_HEIGHT_GROUP_ITEM = 160

GRID_WIDTH_GROUP_SOURCE = 800
GRID_HEIGHT_GROUP_SOURCE = 300

GRID_WIDTH_GROUP_DAY = 250
GRID_HEIGHT_GROUP_DAY = 200

GRID_WIDTH_GROUP_TYPE = 200
GRID_HEIGHT_GROUP_TYPE = 200
var W = 50
var MAX_ROW = 7

Vis = function (_parentElement, _data) {
    this.parentElement = _parentElement
    this.data = _data
    this.initVis()
    
};

// initialize static elements of vis
Vis.prototype.initVis = function () {

    let vis = this
    vis.margin = {top: 50, right: 40, bottom: 60, left: 100};

    // drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", 1200)
            .attr("height", 800)
            .append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // prepare initial data
    vis.displayData = vis.data.map((attr, i) => {
        entry = {}
        entry.index = i
        entry.day = attr["Date"]
        entry.time = attr["Time"]
        entry.name = attr["Food Name"]
        entry.type = attr["Type"]
        entry.source = attr["Source"]
        entry.hunger = +attr["Hunger (before)"]
        entry.satisfaction = +attr["Satisfaction (after)"]
        return entry
    })

    vis.colorScale = {
        satisfaction: d3.scaleLinear()
            .domain(d3.extent(vis.displayData, (d =>d.satisfaction))) 
            .range(["#eee", "deeppink"]),
        hunger: d3.scaleLinear()
            .domain(d3.extent(vis.displayData, (d =>d.hunger))) 
            .range(["#eee", "black"])
    }

    // tooltip
    vis.tooltip = d3.select("body").append('div')
             .attr("class", "tooltip")
             .style("opacity", 0)
            .style("position", "absolute")
            .style("left", `${550}px`)
            .style("top", `${35}px`)
            .style("max-width", "270px")
            .style("padding", "12px 16px")
            .style("background", "#f9f9f9")
            .style("border", "1px solid #ccc")
            .style("border-radius", "6px")
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
            .style("text-align", "left")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", "13px")
            .style("color", "#333")
            .style("pointer-events", "none")

    // paths for food type icons
    vis.paths = {
        meal: (x, y) => {
        const outerR = W / 2;  // outer radius
        const innerR = W / 6; // inner radius

        return `
            M ${x + W/2} ${y} 
            a ${outerR} ${outerR} 0 1 0 0 ${W} 
            a ${outerR} ${outerR} 0 1 0 0 ${-W} 
            M ${x + W/2} ${y + (outerR - innerR)} 
            a ${innerR} ${innerR} 0 1 1 0 ${2 * innerR} 
            a ${innerR} ${innerR} 0 1 1 0 ${-2 * innerR} 
            z
        `;
    },

    snack: (x, y, k=0.8) => {
        const r = W * 0.1 * k; // scaled corner radius
        const scaledW = W * k; // scaled width/height

        return `
            M ${x + r} ${y} 
            L ${x + scaledW - r} ${y + scaledW * 0.2} 
            Q ${x + scaledW} ${y + scaledW * 0.2} ${x + scaledW - r} ${y + scaledW * 0.2 + r} 

            L ${x + scaledW * 0.5 + r} ${y + scaledW - r} 
            Q ${x + scaledW * 0.5} ${y + scaledW} ${x + scaledW * 0.5 - r} ${y + scaledW - r} 

            L ${x + r} ${y + r} 
            Q ${x} ${y + r * 0.5} ${x + r} ${y} 
            Z
        `;
    },

    drink: (x, y) => {
        const waveHeight = W * 0.05; // amplitude of the wave
        const waveWidth = W * 0.25;  // width of one wave segment
        return `
            M ${x + W*0.25} ${y + W*0.2 + waveHeight}
            q ${waveWidth/2} ${-waveHeight*2} ${waveWidth} 0
            q ${waveWidth/2} ${waveHeight*2} ${waveWidth} 0
            l ${-W*0.08} ${W*0.65}
            l ${-W*0.34} 0
            z
        `;
    },

    dessert: (x, y) => {
        // Enlarged cupcake (same proportions, fills more space)
        return `
            M ${x + W*0.15} ${y + W*0.55}
            l ${W*0.7} 0
            l ${-W*0.12} ${W*0.35}
            l ${-W*0.46} 0
            z

            M ${x + W*0.15} ${y + W*0.55}
            q ${W*0.35} ${-W*0.55}, ${W*0.7} 0
            q ${-W*0.175} ${-W*0.22}, ${-W*0.35} 0
            q ${-W*0.175} ${-W*0.22}, ${-W*0.35} 0
            z
        `;
    }
    }
    
    // group coordinates
    vis.groups = { 
        source: { "homemade": { cx: GRID_WIDTH_GROUP_SOURCE / 4, cy: GRID_HEIGHT_GROUP_SOURCE / 2},
                  "bought": {cx: GRID_WIDTH_GROUP_SOURCE * 3 / 4, cy: GRID_HEIGHT_GROUP_SOURCE / 2}},
        name: {},
        day: {},
        type: {}

    }

    vis.labels = { source: [
        {text:"Homemade", x: GRID_WIDTH_GROUP_SOURCE / 4, y: GRID_HEIGHT_GROUP_SOURCE},
        {text:"Store-Bought", x: GRID_WIDTH_GROUP_SOURCE * 3 / 4, y: GRID_HEIGHT_GROUP_SOURCE},
        ], name: [], day: [], type: []}

    var i = 0

    // food item group (4x4 grid)
    vis.displayData.forEach((d) => {

        if (vis.groups.name[d.name] === undefined) {
            // group center
            vis.groups.name[d.name] = {}
            vis.groups.name[d.name].cx =  (i % 4)*GRID_WIDTH_GROUP_ITEM + GRID_WIDTH_GROUP_ITEM / 2
            vis.groups.name[d.name].cy = (Math.floor(i / 4)) *GRID_HEIGHT_GROUP_ITEM + GRID_HEIGHT_GROUP_ITEM / 2 - 50

            //label
            vis.labels.name.push({ 
                text: d.name, 
                x: (i % 4)*GRID_WIDTH_GROUP_ITEM + GRID_WIDTH_GROUP_ITEM / 2,
                y: (Math.floor(i / 4) + 1) *GRID_HEIGHT_GROUP_ITEM - 50
            })
            i++
        }
        
    });

    // day of the week groups
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    days.forEach((d, i) => {
        // group centers
        vis.groups.day[d] = {}
        // top row (3 items)
        if (i < 3) {
            vis.groups.day[d].cx = GRID_WIDTH_GROUP_DAY * (i + 1/2)
            vis.groups.day[d].cy = GRID_HEIGHT_GROUP_DAY / 2
            vis.labels.day.push({ text: d, x: GRID_WIDTH_GROUP_DAY * (i + 1/2), y: GRID_HEIGHT_GROUP_DAY + 50})
        }
         // bottom row (2 items)
        else {
            i -= 3
            vis.groups.day[d].cx = GRID_WIDTH_GROUP_DAY * (i + 1)
            vis.groups.day[d].cy = GRID_HEIGHT_GROUP_DAY * 3 / 2 + 50
            vis.labels.day.push({ text: d, x: GRID_WIDTH_GROUP_DAY * (i + 1), y: GRID_HEIGHT_GROUP_DAY * 2 + 50})
        }
       
        // labels for days
       
    })

    // food type groups
    const foodTypes = ["meal", "dessert", "snack", "drink"]
    foodTypes.forEach((d, i) => {
        vis.groups.type[d] = {}
        vis.groups.type[d].cx = GRID_WIDTH_GROUP_TYPE * (i + 1/2)
        vis.groups.type[d].cy = GRID_HEIGHT_GROUP_TYPE / 2
        vis.labels.type.push({ text: d.charAt(0).toUpperCase() + d.slice(1), x: GRID_WIDTH_GROUP_TYPE * (i + 1/2), y: GRID_HEIGHT_GROUP_TYPE + 50})
    })

    // food type legend
    const legend = vis.svg.append("g")
        .attr("transform", `translate(${850}, 0)`);

    W = 20
    legend.append("path")
        .attr("d", vis.paths.meal(0, 0))

    const items = legend.selectAll(".legend-item")
        .data(foodTypes)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("fill", "#616263")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);
    items.append("path")
        .attr("d", (d, i) => vis.paths[d](0, 0))
    
    items.append("text")
        .attr("x", 40)
        .attr("y", 15)
        .attr("fill", "#333")
        .text(d => d.charAt(0).toUpperCase() + d.slice(1))
        .style("font-size", "13px")
        .style("font-weight", "bold")
    // legend background rectangle
    const padding = 10;
    const legendWidth = 100; 
    const legendHeight = 110;

    legend.insert("rect", ":first-child") 
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("x", -padding/2)
        .attr("y", -padding/2)
        .attr("fill", "white")   
        .attr("stroke", "#333")   
        .attr("stroke-width", 1)
        .attr("rx", 8) 
        .attr("ry", 8);
    W = 50

    // ====== Color scales under the food type legend ======
    const colorScalePadding = 20;  // space between the food type icons and color scales
    const barWidth = 80;
    const barHeight = 12;

    // compute starting Y for the scales, just under the last food type
    const scalesStartY = foodTypes.length * 25 + colorScalePadding;

    // --- Add defs for gradients ---
    const defs = vis.svg.append("defs");

    // Satisfaction gradient
    const satGradient = defs.append("linearGradient")
        .attr("id", "sat-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
    satGradient.selectAll("stop")
        .data([
            { offset: "0%", color: "#eee" },
            { offset: "100%", color: "deeppink" }
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Hunger gradient
    const hungerGradient = defs.append("linearGradient")
        .attr("id", "hunger-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
    hungerGradient.selectAll("stop")
        .data([
            { offset: "0%", color: "#eee" },
            { offset: "100%", color: "black" }
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // satisfaction bar
    legend.append("rect")
        .attr("x", 10)
        .attr("y", scalesStartY)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("fill", "url(#sat-gradient)");

    // Satisfaction label
    legend.append("text")
        .attr("x", 10)
        .attr("y", scalesStartY - 2)
        .text("Satisfaction")
        .attr("fill", "black")
        .style("font-size", "11px");

    // Satisfaction min/max labels
    legend.append("text")
        .attr("x", 10) // min label at start
        .attr("y", scalesStartY + barHeight + 10)
        .text("4")  // min value
        .attr("fill", "#616263")
        .style("font-size", "11px");

    legend.append("text")
        .attr("x", 10 + barWidth) // max label at end
        .attr("y", scalesStartY + barHeight + 10)
        .text("9")  // max value
        .attr("fill", "#616263")
        .style("font-size", "11px")
        .attr("text-anchor", "end");

    // hunger bar
    legend.append("rect")
        .attr("x", 10)
        .attr("y", scalesStartY + barHeight + 30) // small gap between bars
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("fill", "url(#hunger-gradient)");

    // Hunger label
    legend.append("text")
        .attr("x", 10)
        .attr("y", scalesStartY + barHeight + 28)
        .text("Hunger")
        .attr("fill", "black")
        .style("font-size", "11px");

    // Hunger min/max labels
    legend.append("text")
        .attr("x", 10) // min label
        .attr("y", scalesStartY + barHeight*2 + 40)
        .text("2")
        .attr("fill", "#616263")
        .style("font-size", "11px");

    legend.append("text")
        .attr("x", 10 + barWidth) // max label
        .attr("y", scalesStartY + barHeight*2 + 40)
        .text("9")
        .attr("fill", "#616263")
        .style("font-size", "11px")
        .attr("text-anchor", "end");

    // background rectangle
    const totalLegendHeight = scalesStartY + barHeight*2 + 50;
    legend.select("rect")
        .attr("height", totalLegendHeight);

    // toggle group/individual selections
    const sortSelect = document.getElementById("select-order-type");
    const groupSelect = document.getElementById("select-group-type");

    // mute group by default
    groupSelect.classList.add("muted");

    function updateVisualExclusiveness() {
        // identify which category was selected
        const sortActive = this === sortSelect;
        const groupActive = this === groupSelect;

        // update previous values
        sortVal = sortSelect.value
        groupVal = groupSelect.value


        // Mutual exclusivity logic
        if (sortActive) {
            sortSelect.classList.remove("muted");
            groupSelect.classList.add("muted");
        } else if (groupActive) {
            groupSelect.classList.remove("muted");
            sortSelect.classList.add("muted");
        } 
    }

    // Listen for changes
    sortSelect.addEventListener("click", updateVisualExclusiveness);
    groupSelect.addEventListener("click", updateVisualExclusiveness);

    // Initialize on load
    updateVisualExclusiveness();
};


/*
 * Data wrangling
 */

Vis.prototype.wrangleData = function (sortBy, colorBy, groupBy) {

    let vis = this
    vis.colorBy = colorBy ? colorBy : vis.colorBy
    vis.groupBy = groupBy ? groupBy : vis.groupBy

    // sort by alphabet
    if (sortBy === "name") {
        vis.displayData.sort((a, b) => a[sortBy].localeCompare(b[sortBy]))
       
    }
    // sort by numerical values
    else {
        vis.displayData.sort((a, b) => b[sortBy] - a[sortBy])
    }

    // stop previous group simulation
    if (vis.simulation) {
        vis.simulation.stop()
    }

    if (sortBy)
        vis.updateVis()


    if (colorBy) {
        vis.updateColor()
    }
    
    if (groupBy)
        vis.updateGroup()

};

Vis.prototype.updateColor = function () {
    let vis = this
    vis.svg.selectAll(".encoding")
        .attr("opacity", "0.5")
        .attr("fill", "lightgrey")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 10 + 200)
        .ease(d3.easeCubicOut)
        .attr("opacity", "1")
        .attr("fill", d => vis.colorScale[vis.colorBy](d[vis.colorBy]))

}

Vis.prototype.updateGroup = function () {
 
    const drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    function dragstarted(event, d) {
        if (!event.active) vis.simulation.alphaTarget(0.3).restart(); // wake up simulation
        d3.select(this).style("cursor", "grabbing");
    }

    function dragged(event, d) {
        d.fx = event.x; // move with the cursor
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) vis.simulation.alphaTarget(0); // cool down simulation
        d.fx = null; // release fixed position
        d.fy = null;
        d3.select(this).style("cursor", "grab");
    }

    // helper functions to get the center coordinates for a data point
    const getCX = function (d) {
        if (vis.groupBy === "name") {
            return vis.groups.name[d.name].cx
        }
        else if (vis.groupBy === "source") {
            return d.source === "homemade" ? vis.groups.source.homemade.cx : vis.groups.source.bought.cx
        }

        else if (vis.groupBy === "day") {
            return vis.groups.day[d.day].cx
        }

        else if (vis.groupBy === "type") {
            return vis.groups.type[d.type].cx
        }
    }

    const getCY = function (d) {
        if (vis.groupBy === "name") {
            return vis.groups.name[d.name].cy
        }
        else if (vis.groupBy === "source") {
            return d.source === "homemade" ? vis.groups.source.homemade.cy : vis.groups.source.bought.cy
        }
        else if (vis.groupBy === "day") {
            return vis.groups.day[d.day].cy
        }
         else if (vis.groupBy === "type") {
            return vis.groups.type[d.type].cy
        }
    }
    
    vis.svg.selectAll(".encoding")
        .transition()
        .duration(800)         // adjust to control speed
        .ease(d3.easeCubicOut)
        .attrTween("d", function(d) {
            let start = { x: d.x, y: d.y };
            let end = { x: getCX(d), y: getCY(d) };
            return function(t) {
                d.x = start.x + (end.x - start.x) * t;
                d.y = start.y + (end.y - start.y) * t;
                return vis.paths[d.type](d.x, d.y);
            };
        })
        .on("end", () => {
            // now start simulation after the smooth transition
            vis.simulation.alpha(0.3).restart();
        });

    vis.simulation = d3.forceSimulation(vis.displayData)
        // forces to move items toward their group center
        .force("x", d3.forceX(d => getCX(d)).strength(0.25))
        .force("y", d3.forceY(d => getCY(d)).strength(0.25))
    
        // prevent overlap
        .force("collision", d3.forceCollide(25))

        // charge between nodes
        .force("charge", d3.forceManyBody().strength(5))

        // stop simulation after stabilizing
        .on("tick", ticked);

    vis.svg.selectAll(".encoding").style("cursor", "grab").call(drag)
        

    function ticked() {
        vis.svg.selectAll(".encoding")
            .attr("d", function(d) { 
                return vis.paths[d.type](d.x - W /2, d.y - W / 2)
            })   
    }

    // update group labels
    const labelData = vis.svg.selectAll(".group-label")
        .data(vis.labels[vis.groupBy])
    const labels = labelData.enter()
        .append("text")
        .attr("class", "group-label")
        .attr("text-anchor", "middle")
    labelData.merge(labels)
        .text(d => d.text)
        .attr("x", d => d.x)
        .attr("y", d => d.y);

    labelData.exit().remove()
   
}

// draw vis for individually sorted items
Vis.prototype.updateVis = function () {
    let vis = this;

    // remove group labels
    vis.svg.selectAll(".group-label")
        .data([])
        .exit()
        .transition()
        .remove()

    let dataJoin = vis.svg.selectAll(".encoding")
        .data(vis.displayData, d => d.index)
        
    let encodings = dataJoin.enter()
        .append("path")
        .attr("class", "encoding")
        .style("cursor", "default")
        .on('mouseover', function(event, d){
            // highlight all foods with the same name
            vis.svg.selectAll(".encoding")
                .attr("opacity", (e) => e.name === d.name ? "1" : "0.1")
            // show tooltip
            vis.tooltip
                .style("opacity", 1)
                .html(`
                     <div style="font-family: 'Indie Flower', cursive;">
            <strong style="
                display:block; 
                margin-bottom:6px; 
                font-size:18px; 
                font-weight:700; 
                line-height:1.2; 
                letter-spacing:0.5px;
            ">
                ${d.name}
            </strong>
            <span style="display:block; margin-bottom:4px; color:#666; font-size:14px">
                ${d.source}
            </span>
            <span style="display:block; margin-bottom:6px; color:#666; font-size:14px">
                ${d.day}, ${d.time}
            </span>
            <span style="display:block; margin-bottom:2px; font-size:14px">
                Hunger: <strong>${d.hunger}</strong>
            </span>
            <span style="display:block; font-size:14px">
                Satisfaction: <strong>${d.satisfaction}</strong>
            </span>
        </div>`);
        })
        .on('mouseout', function(event, d){

            vis.svg.selectAll(".encoding")
                .attr("opacity", "1")
        
            vis.tooltip
                .style("opacity", 0)
                .html(``);
        });

   dataJoin.merge(encodings)
        .attr("opacity", "0.5")
        .on(".drag", null)
        .style("cursor", "auto")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 10)
        .ease(d3.easeCubicOut)
        .attr("opacity", "1")
        .attr("fill", d => vis.colorScale[vis.colorBy](d[vis.colorBy]))
        .attr("d", function(d, i) {
            // x, y is top left corner
            let x = (i % 7)*GRID_WIDTH_SINGLE
            let y = (Math.floor(i / 7)) *GRID_WIDTH_SINGLE

            // update x,y coordinates
            d.x = x
            d.y = y
            
            return vis.paths[d.type](x, y)
    
        })
};
