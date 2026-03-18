let todoinput=document.getElementById("todo");
let text=document.querySelector(".text");
function todoadd(){
    if(todoinput.value==""){
        alert("please add some task")
    }
    else{
        let list=document.createElement("ul");
        list.innerHTML=`${todoinput.value}`;
        text.appendChild(list);
        todoinput.value=""
    }
}