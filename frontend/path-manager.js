let upArrow = '&#8593;';
let downArrow = '&#8595;';

// called on window load to set button event handlers
function loadManager()
{

  $("#tableCloseBtn").click(() => {
    $("#pathMgr").css("display", "none")
  });

  $("#deleteAll").click(() => {
    if (confirm("Are you sure you want to delete all paths?"))
    {
        while (Path.AllPaths.length > 0)
        {
            Path.AllPaths[0].Delete();
        }
        updateSelectionDisplay();
        updateTable();
    }
  });

  $(".ptHeader").click((event) => {
      tableSort(event);
  });

  $(".filterInput").on('change', () => {
      filter();
  });

  $("#Search").on('input', () => {
      filter();
  });

  $("#collapseFilter").click(() => {
      toggleFilters();
  });

  $("#pathMgr").mousedown((e) => {
      let off = $("#pathMgr").offset();
      //Determine if the click was outsdie of an element on the table
      if(e.target.id === 'pathMgr' || e.target.id === 'pathOptions' || e.target.tagName === 'H3' ){
          clickDeselect = true;
      }
      else {
          clickDeselect = false;
      }
      dragging = true;
      initClick = [e.clientX, e.clientY];
      initPos = [off.left, off.top];
  });


  $("#pathMgr").mouseup(() => {
      dragging = false;
      //if the user clicked on path manager interface outside of table, clear selected paths
      if(clickDeselect){
          clearSelection();
      };
  });


  $("body").mousemove((e) => {
      if (dragging & e.which == 1) {
          //if the mouse has moved after initial mousedown, the user is not tryign to deselect all paths
              if(clickDeselect){
                  clickDeselect = false;
              }
          dragElement($("#pathMgr"), e, initClick, initPos);
      }
  });
}

//function to populate/update the table
function updateTable() {

  $("#deleteSelected").attr("disabled", Path.CurrentSelection.length === 0);
  $("#downloadRaw").attr("disabled", Path.CurrentSelection.length === 0);
  $("#downloadFormatted").attr("disabled", Path.CurrentSelection.length === 0);

  //get the table body element
  let table = document.getElementById('pathTable');
  //set the content of the table to be empty
  table.innerHTML = '';

  //iterate through each path in the list of all paths
  Path.AllPaths.forEach(path => {
    //create a new row
    let row = table.insertRow(-1);
    //highlight the row if the path is selected
    if(path.Selected) {
      row.style.backgroundColor = "red";
    }

    //populate the cells according to the content of the path
    let name = row.insertCell(0);
    name.innerHTML = path.Name;

    let MMSI = row.insertCell(1);
    MMSI.innerHTML = path.MMSI;

    let StartLat = row.insertCell(2);
    StartLat.innerHTML = path.StartLat.toFixed(2);

    let StartLon = row.insertCell(3);
    StartLon.innerHTML = path.StartLon.toFixed(2);

    let pathLength = row.insertCell(4);
    pathLength.innerHTML = path.Length.toFixed(2);

    let speed = row.insertCell(5);
    speed.innerHTML = path.AverageSpeed.toFixed(2);

    let numEvents = row.insertCell(6);
    numEvents.innerHTML = path.PathEvents.length;
    
    //select the path if the row is clicked on
    $(row).click((e) => {
      //determine if the path was already selected
      let isSelected = path.Selected;
      //if shift click/ allow multiple selection
      if(e.originalEvent.shiftKey){
        path.ToggleSelect();
      }
      //otherwise, clear the rest of the selected paths from the current selection
      else{
        //clear the current selection, update the affected paths
        clearSelection();
        //if the path wasn't already selected, select it
          path.ToggleSelect();
      }
      //plot the updated path;
      updatePath(path, !isSelected);
      updateSelectionDisplay();
    });
  });
  //filter the table
  filter();
};


//function for sorting a specific field in either ascending or descending order
const sortBy = (field, reversed, primer) => {
  //if data needs to be primed, prime it
  const key = primer ? 
    function(x){
      return primer(x[field])
    }:
    function(x) {
      return x[field]
    };

    //Reverse according to if data needs to be ascending/descending
    reversed = !reversed ? 1: -1;
    
    //return the sorted list
    return function(a, b){
      return a = key(a), b = key(b), reversed * ((a > b) - (b > a));
    }
}
  

//function for filtering according to a speciifc range of values in one column
function filterNumerical(tableCol, min, max) {
  //get the table body object
  let table = document.getElementById("pathTable");
  //get the array of table rows
  let tr = table.getElementsByTagName("tr");
  let td;

  //iterate through each row in the table
  for(let i=0; i<tr.length; i++){
    //get the cell from the relevant column in the row
    td = parseInt(tr[i].getElementsByTagName("td")[tableCol].innerHTML);
    //Hide the row if the value is not within the range
    if(td < min || td > max){
      tr[i].style.display = "none";
    }
  }

}


//Function for searching throught he table to find a search string input by user
function search(){
  //Get the target of the search (either path name, MMSI, or entire table)
  let target = $("#SearchTarget").val();
  //get the search string
  let myFilter = $("#Search").val().toUpperCase();
  //create an array of the table rows
  let table = document.getElementById("pathTable");
  let tr = table.getElementsByTagName("tr");
  //initialize relevant valiables
  let wholeTable = false;   //searching the whole table?
  let tableCol;             //current columm int he row 
  let inRow = false;        //whether the search string was found in the current row

  //switch for determining where to search
  switch(target){
    case "WholeTable":
      wholeTable=true;
      break;
    case "PathName":
      tableCol = 0;
      break;
    case "MMSI":
      tableCol = 1;
      break;
  }

  //iterate through each row in the table
  for (i = 0; i < tr.length; i++) {
    //if the whole table is searched, look through each colum in the row
    if(wholeTable){
      inRow = false;                                            //set inRow to false at the start of each row
      for(let j=0; j<7; j++){                                   //iterate through the columns
        let td= tr[i].getElementsByTagName("td")[j];            //getting current cell in the table
        txtValue = td.textContent || td.innerText;              //getting text from current cell
        if (txtValue.toUpperCase().indexOf(myFilter) > -1) {    //checking if search string is in cell
          inRow = true;                                         //if yes, set inRow to true
          //Highlight cell in which it was found, but only if there is a search string
          if(myFilter.length > 0)
            td.style.backgroundColor = "orange";
          else
            td.style.backgroundColor = "";
        }
        else
          td.style.backgroundColor = "";
      }
      
      //Hide row if no cells in row contain search string
      if(!inRow) tr[i].style.display = "none";
      else tr[i].style.display = "";
    }
    //If only searching a single column, no need to iterate through columns or highlight cells
    else{
      td = tr[i].getElementsByTagName("td")[tableCol];        //getting current cell in the table
      txtValue = td.textContent || td.innerText;              //iterate through the columns
      //Hide row if no cells in row contain search string
        if (txtValue.toUpperCase().indexOf(myFilter) > -1) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
    }    
  }
}
 

function filter(){
  //get the table and an array of the table rows
  let table = document.getElementById("pathTable");
  let tr = table.getElementsByTagName("tr");
  
  //reset the display status of the rows
  for(let i=0; i<tr.length; i++){
      tr[i].style.display = "";  
  }

  //search the table for the search string
  search();

  //Filter the table according to the filter inputs

  let latMin = $("#LatLow").val();
  let latMax = $("#LatHigh").val();
  filterNumerical(2, latMin || -90, latMax || Number.MAX_SAFE_INTEGER);

  let longMin = $("#LongLow").val();
  let longMax = $("#LongHigh").val();
  filterNumerical(3, longMin || -180, longMax || Number.MAX_SAFE_INTEGER);

  let lengthMin = $("#LengthLow").val();
  let lengthMax = $("#LengthHigh").val();
  filterNumerical(4, lengthMin || 0, lengthMax || Number.MAX_SAFE_INTEGER);

  let speedMin = $("#SpeedLow").val();
  let speedMax = $("#SpeedHigh").val();
  filterNumerical(5, speedMin || 0, speedMax || Number.MAX_SAFE_INTEGER);

  let eventsMin = $("#EventsLow").val();
  let eventsMax = $("#EventsHigh").val();
  filterNumerical(6, eventsMin || 0, eventsMax || Number.MAX_SAFE_INTEGER);
}


function tableSort(event) {
  //find the element that was clicked on
  let element = event.target;
  let field, arrow, reverse;

  //Assign field according to which element was clicked on
  if (element.tagName === 'SPAN'){
    field = element.id;
    arrow = element.getElementsByClassName('arrow')[0];
  }
  else if(element.className === "arrow"){
    field = element.parentElement.id;
    arrow = element;
  }
  else {
    field = element.getElementsByTagName('SPAN')[0].id;
    arrow = element.getElementsByTagName('SPAN')[0].getElementsByClassName('arrow')[0];
  }

  //get the value of which way the current arrow is facing
  let curArrow = arrow.getAttribute("data-arrow");

  //clears all of the arrows from the table headers
  clearArrows();

  //if the arrow is currenlty up, reverse the data and set the arrow to be down
  if(curArrow == "up"){
    arrow.setAttribute("data-arrow", "down")
    reverse = true;
    arrow.innerHTML = downArrow;   
  }
  //otherwise, reverse is false and set the arrow to be up
  else {
    arrow.setAttribute("data-arrow", "up")
    arrow.innerHTML = upArrow;
    reverse = false;
  }

  //sort the data in the table
  if (field == "numEvents")
    Path.AllPaths.sort(sortBy("PathEvents", reverse, p => p.length));
  else
    Path.AllPaths.sort(sortBy(field, reverse));
  //update the table
  updateTable();
}

function deletePath() {
  while (Path.CurrentSelection.length > 0) {
    Path.CurrentSelection[0].Delete();
  }

  updateTable();
  updateSelectionDisplay();
}


//Function for clearing all of the sorting arrows from the table headers
function clearArrows() {
  let arrows = document.getElementsByClassName('arrow');
  for (let arrow of arrows) {
    arrow.setAttribute("data-arrow", "none");
    arrow.innerHTML = "";
  }
}

function dragElement(element, event,startClick, startPos) {

  let deltaX = event.clientX - startClick[0];
  let deltaY = event.clientY - startClick[1];

  let newX = startPos[0] + deltaX;
  let newY = startPos[1] + deltaY;

  element.css({"left":newX, "top":newY})
}

function toggleFilters(){
  let btn = $("#collapseFilter");
  let isDisplayed = btn.html() === "Filter -";
  

  if(isDisplayed){
    $("#filterContainer").css("display", "none");
    btn.html("Filter +");
  }
  else{
    $("#filterContainer").css("display", "");
    btn.html("Filter -");
  }
}