const map = new Map();

async function send_request(filename)
{

    return new Promise((resolve, reject) => {
        var xmlhttp = null;
        if (window.XMLHttpRequest)
        {
            xmlhttp=new XMLHttpRequest();
        }
        else if (window.ActiveXObject)
        {
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }

        if (xmlhttp!=null)
        {
            // serverUrl是 用户获取 '签名和Policy' 等信息的应用服务器的URL，请将下面的IP和Port配置为您自己的真实信息。
            let serverUrl = 'http://localhost:3666/assets/attachment/generateSign'
            var requestBody ={
                "from":"attachment",
                "tableId":"tblvAbYVRp3k0g0Gl",
                "columnId":"fldwIZP7qWl84EYas",
                "filename":filename
            };

            var requestBodyString = JSON.stringify(requestBody);

            xmlhttp.open( "POST", serverUrl, true);
            xmlhttp.setRequestHeader("Content-Type", "application/json");
            xmlhttp.send(requestBodyString);

            xmlhttp.onreadystatechange = ()=>{
                if (xmlhttp.readyState==4 && xmlhttp.status==200)
                {
                    console.log(xmlhttp.responseText);
                    resolve( xmlhttp.responseText)
                }

            }


        }
        else
        {
            reject("Your browser does not support XMLHTTP.")
        }
    })

}


async function get_signature(id,filename)
{
    let param = map.get(id);


    // 可以判断当前expire是否超过了当前时间， 如果超过了当前时间， 就重新取一下，3s 作为缓冲。
    let now = timestamp = Date.parse(new Date()) / 1000;
    if (!param||param.expire < now + 3)
    {
        const body = await send_request(filename);
        var {data:obj} = eval ("(" + body + ")");

        console.log(obj);
        let host = obj['host']
        let policyBase64 = obj['policy']
        let accessid = obj['accessid']
        let signature = obj['signature']
        let expire = parseInt(obj['expire'])
        let callbackbody = obj['callback']
        let g_object_name = obj['objectPath']

        param = {
            host,policyBase64,accessid,signature,expire,callbackbody,g_object_name
        };

        map.set(id,param)
    }

    return param;
}





function set_upload_param(up,id, filename)
{
    get_signature(id,filename).then(data=>{
        console.log(data);
        let new_multipart_params = {
            'key' : data.g_object_name,
            'policy': data.policyBase64,
            'OSSAccessKeyId': data.accessid,
            'success_action_status' : '200', //让服务端返回200,不然，默认会返回204
            'callback' : data.callbackbody,
            'signature': data.signature,
        };

        up.setOption({
            'url': data.host,
            'multipart_params': new_multipart_params
        });

        up.start();
    })

}

var uploader = new plupload.Uploader({
	runtimes : 'html5,flash,silverlight,html4',
	browse_button : 'selectfiles',
    //multi_selection: false,
	container: document.getElementById('container'),
	flash_swf_url : 'lib/plupload-2.1.2/js/Moxie.swf',
	silverlight_xap_url : 'lib/plupload-2.1.2/js/Moxie.xap',
    url : 'http://oss.aliyuncs.com',

    filters: {
        max_file_size : '10mb', //最大只能上传10mb的文件
        prevent_duplicates : true //不允许选取重复文件
    },

	init: {
		PostInit: function(up) {
			document.getElementById('ossfile').innerHTML = '';
            document.getElementById('postfiles').onclick = function() {
                console.log();
                set_upload_param(up,up.files[0].id,up.files[0].name);
                return false;
            };
		},

		FilesAdded: function(up, files) {
			plupload.each(files, function(file) {
				document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ')<b></b>'
				+'<div class="progress"><div class="progress-bar" style="width: 0%"></div></div>'
				+'</div>';
			});
		},

		BeforeUpload: function(up, file) {
           return  set_upload_param(up, file.id,file.name);
        },

		UploadProgress: function(up, file) {
			var d = document.getElementById(file.id);
			d.getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
            var prog = d.getElementsByTagName('div')[0];
			var progBar = prog.getElementsByTagName('div')[0]
			progBar.style.width= 2*file.percent+'px';
			progBar.setAttribute('aria-valuenow', file.percent);
		},

		FileUploaded: function(up, file, info) {
            if (info.status == 200)
            {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload to oss success, object name:' + map.get(file.id).g_object_name + ' 回调服务器返回的内容是:' + info.response;
            }
            else if (info.status == 203)
            {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = '上传到OSS成功，但是oss访问用户设置的上传回调服务器失败，失败原因是:' + info.response;
            }
            else
            {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = info.response;
            }
		},

		Error: function(up, err) {
            if (err.code == -600) {
                document.getElementById('console').appendChild(document.createTextNode("\n选择的文件太大了,可以根据应用情况，在upload.js 设置一下上传的最大大小"));
            }
            else if (err.code == -601) {
                document.getElementById('console').appendChild(document.createTextNode("\n选择的文件后缀不对,可以根据应用情况，在upload.js进行设置可允许的上传文件类型"));
            }
            else if (err.code == -602) {
                document.getElementById('console').appendChild(document.createTextNode("\n这个文件已经上传过一遍了"));
            }
            else
            {
                document.getElementById('console').appendChild(document.createTextNode("\nError xml:" + err.response));
            }
		}
	}
});

uploader.init();
