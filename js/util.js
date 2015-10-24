var createUUID = (function (uuidRegEx, uuidReplacer) { 
 return function () { 
 return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace

(uuidRegEx, uuidReplacer).toUpperCase(); 
};
 })(/[xy]/g, function (c) { 
 var r = Math.random() * 16 | 0, 
 v = c =="x"? r : (r & 3 | 8); 
 return v.toString(16); 
});


var createHtml = function(id, text){
    
	var html = "<a id='" + id + "'>" + text +"</a></br>";
	return  html;
}
//oT
function addEventHandler(target, eventType, _hander, param)
    {
        var handler = _hander;
        if(param)
        {
            handler = function(e)
            {
                _hander.call(this, param);//继承监听函数,并传入参数以初始化;
            }
        }
       
        if(target.addEventListener)
        {
            target.addEventListener(eventType, handler, false);
        }
        else if(target.attachEvent)
        {
            target.attachEvent("on" + eventType, handler);
        }
        else
        {
            target["on" + eventType] = handler;
        }
    }

