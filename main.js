
var vis; 

// load data
d3.csv("data.csv").then(d => {
    vis = new Vis("chart-area", d);
    vis.wrangleData("name", "satisfaction", null)
})


document.getElementById('select-order-type').onclick = function () {
    vis.wrangleData(this.value, null, null);
}
document.getElementById('select-color-type').onchange = function () {
    vis.wrangleData(null, this.value, null);
}

document.getElementById('select-group-type').onclick = function () {
    vis.wrangleData(null, null, this.value);
}