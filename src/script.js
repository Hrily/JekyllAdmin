function GithubContentsApi(token=''){
	this.username = '';
	this.token = token;
	this.auth = function(username, password, cb){
		this.username = username;
		var t = new Date();
		auth = btoa(username+':'+password);
		$.ajax({ 
			url: 'https://api.github.com/authorizations',
			type: 'POST',
			beforeSend: function(xhr) { 
				xhr.setRequestHeader("Authorization", "Basic " + auth); 
			},
			data: '{"scopes":["repo"],"note":"Create Repo with Ajax ' + t.getTime() + '"}',
			success: function(response) {
				authid = response.id;
				token = response.token;
				cb(true);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.putFile = function(repo, file, content, message, branch='master', cb){
		json = {
			'message': message,
			'content': btoa(content),
			'branch': branch
		};
		$.ajax({
			url: 'https://api.github.com/repos/' + this.username + '/' + repo + '/contents/' + file,
			type: 'PUT',
			data: JSON.stringify(json),
			beforeSend: function(xhr) { 
				xhr.setRequestHeader("Authorization", "token " + token);
			},
			success: function(response){
				cb(response);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.updateFile = function(repo, file, content, message, sha, branch='master', cb){
		json = {
			'message': message,
			'content': btoa(content),
			'sha': sha,
			'branch': branch
		};
		$.ajax({
			url: 'https://api.github.com/repos/' + this.username + '/' + repo + '/contents/' + file,
			type: 'PUT',
			data: JSON.stringify(json),
			beforeSend: function(xhr) { 
				xhr.setRequestHeader("Authorization", "token " + token);
			},
			success: function(response){
				cb(response);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.getFiles = function(repo, path='', branch='master', cb){
		$.ajax({
			url: 'https://api.github.com/repos/' + this.username + '/' + repo + '/contents/' + path + "?ref=" + branch,
			type: 'GET',
			success: function(response){
				cb(response);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.getFileContents = function(repo, file, branch, cb){
		$.ajax({
			url: 'https://api.github.com/repos/' + this.username + '/' + repo + '/contents/' + file + "?ref=" + branch,
			type: 'GET',
			success: function(response){
				cb(response);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.deleteFile = function(repo, file, message, sha, branch, cb){
		json = {
			'message': message,
			'sha': sha,
			'branch': branch
		};
		$.ajax({
			url: 'https://api.github.com/repos/' + this.username + '/' + repo + '/contents/' + file,
			type: 'DELETE',
			data: JSON.stringify(json),
			beforeSend: function(xhr) { 
				xhr.setRequestHeader("Authorization", "token " + token);
			},
			success: function(response){
				cb(response);
			},
			error: function(err) {
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
	this.delauth =  function(cb){
		$.ajax({ 
			url: 'https://api.github.com/authorizations/'+authid,
			type: 'DELETE',
			beforeSend: function(xhr) { 
				xhr.setRequestHeader("Authorization", "Basic " + auth); 
			},
			success: function(response){
				cb(response);
			},
			error: function(err){
				console.log("error");
				console.log(err);
				cb(false);
			}
		});
	}
}

var gh;
var admin_config;
var blogList;
var converter = new showdown.Converter();

function getAdminConfig(cb) {
	var xhr = new XMLHttpRequest();
	if (xhr.overrideMimeType)
		xhr.overrideMimeType("application/json");
	xhr.onreadystatechange = function() {
		if(xhr.readyState == XMLHttpRequest.DONE) {
			output = xhr.responseText.split('\n').join('');
			admin_config = JSON.parse(output);
			cb(admin_config);
		}
	}
	xhr.open('GET', 'admin_config', true);
	xhr.send(); 
}

function login(){
	$('#login').addClass('disabled').attr('onclick', '');
	var username = $('#username').val();
	var password = $('#password').val();
	gh = new GithubContentsApi();
	gh.auth(username, password, function(result){
		if(!result){
			Materialize.toast('Invalid login!', 3000);
			$('#login').removeClass('disabled').attr('onclick', 'login()');
			return;
		}
		getAdminConfig(function(admin_config){
			getBlogList(admin_config);
		});
		$('.logout-wrapper').css('display', 'inline-block');
	});
}

function logout(){
	$('body').css('opacity', '0.5');
	gh.delauth(function(){
		$('body').css('opacity', '');
		$('.logout-wrapper').css('display', 'none');
		$('main').html('<div class="row">'
			+ '<div class="col s12 m6">'
			+ 	'<h5 class="blue-text">Login</h5>'
			+ 	'<br>'
			+ 	'<div class="input-field">'
			+ 		'<input placeholder="" id="username" type="text" onkeypress="return runScript(event)"/>'
			+ 		'<label for="username">Username</label>'
			+ 	'</div>'
			+ 	'<div class="input-field">'
			+ 		'<input placeholder="" id="password" type="password" onkeypress="return runScript(event)"/>'
			+ 		'<label for="password">Password</label>'
			+ 	'</div>'
			+ 	'<button id="login" class="btn waves-effect waves-light blue" onclick="login()">Login</button>'
			+ '</div>'
			+ '</div>');
	});
}

function getBlogList(admin_config){
	$('main').css('opacity', '0.5');
	gh.getFiles(admin_config.repo, '_posts', admin_config.branch, function(list){
		blogList = list;
		showBlogList(blogList);
		$('main').css('opacity', '');
	})
}

function showBlogList(blogList){
	$('.back-btn').css('transform', 'scale(0)').attr('onclick', '');
	var html = '';
	html += '<ul class="collection with-header">'
	html += '<li class="collection-header"><h5 class="blue-text">Blogs</h5></li>'
	for(var i=0; i<blogList.length; i++)
		html += '<a href="#!" onclick="viewBlog(event)" class="collection-item blue-text" data-index="'
		 + i + '">' + blogList[i].name + '</a>';
	html += '</ul>';
	html += '<a class="btn-floating page-fab blue btn-large" onclick="newBlogDialog()"><i class="material-icons">add</i></a>';
	$('main').html(html);
}

var vindex;
function viewBlog(event){
	$('main').css('opacity', '0.5');
	vindex = $(event.target).attr('data-index');
	var name = blogList[vindex].name;
	gh.getFileContents(admin_config.repo, admin_config.path + '_posts/' + name, admin_config.branch, function(response){
		if(!response){
			Materialize.toast('Failed!', 3000);
			return
		}
		var md = atob(response.content);
		blogList[vindex].md = md;
		printBlog(vindex);
	})
}

function printBlog(vindex){
	var md = blogList[vindex].md;
	var p = new RegExp('---.*---');
	var match = p.exec(md.split('\n').join('<br>'));
	meta = {};
	if(match && match.length>0){
		match = match[0];
		md = md.replace(match.split('<br>').join('\n'), '');
		match += '<br>';
		list = match.split('---<br>').join('').split('<br>');
		for(var i=0; i<list.length; i++){
			kv = list[i].split(':');
			if(kv.length>1) meta[kv[0]] = kv[1].trim();
		}
		if(meta.tags) meta.tags = JSON.parse(meta.tags);
		blogList[vindex].meta = meta;
	}
	blogList[vindex].md = md;
	converter.setFlavor('github');
	var html = ''
	try{
		html += '<div class=row>';
		html += '<h3 class="blue-text col s11">' + eval(blogList[vindex].meta.title) + '<h3>';
		html += '<a href="#!" onclick="deleteBlog(' + vindex + ')" class="waves-effect col s1 delete grey-text"><i class="material-icons">delete</i></a>';
		html += '</div>'
		html += '<h5 class="blue-text">' + eval(blogList[vindex].meta.description) + '</h5>'
	}catch(e){
		console.log(e);
		html += '<div class=row>';
		html += '<h3 class="blue-text col s11">' + blogList[vindex].meta.title + '<h3>';
		html += '<a href="#!" onclick="deleteBlog(' + vindex + ')" class="waves-effect col s1 delete grey-text"><i class="material-icons">delete</i></a>';
		html += '</div>'
		html += '<h5 class="blue-text">' + blogList[vindex].meta.description + '</h5>'
	}
	var date = blogList[vindex].name.split('-');
	date = date[2] + '/' + date[1] + '/' + date[0];
	html += '<h6 class="blue-text">' + date + '</h6>';
	html += converter.makeHtml(md);
	html += '<b>Tags</b>: ';
	for(var i=0; i<blogList[vindex].meta.tags.length; i++)
		html += blogList[vindex].meta.tags[i] + ', ';
	html += '<a class="btn-floating page-fab blue btn-large waves-effect waves-light red" onclick="editBlog(' + vindex + ')"><i class="material-icons">edit</i></a>';
	$('main').html(html).css('opacity', '');
	$('.back-btn').css('transform', 'scale(1.4)').attr('onclick', 'getBlogList(admin_config)');
}

function editBlog(ind){
	var blog = blogList[ind];
	var html = '<h5 class="blue-text">Editing Blog </h5><br>';
	html += '<div class="input-field">';
	try{
		html += '<input placeholder="" id="title" type="text" value="' + eval(blog.meta.title) + '"/>';
	}catch(e){
		html += '<input placeholder="" id="title" type="text" value="' + blog.meta.title + '"/>';
	}
	html += '<label class="active" for="title">Title</label>';
	html += '</div>';
	html += '<div class="input-field">';
	try{
		html += '<input placeholder="" id="description" type="text" value="' + eval(blog.meta.description) + '"/>';
	}catch(e){
		html += '<input placeholder="" id="description" type="text" value="' + blog.meta.description + '"/>';
	}
	html += '<label class="active" for="description">Description</label>';
	html += '</div>';
	html += '<div class="input-field">';
	html += '<input placeholder="" id="tags" type="text" value="' + blog.meta.tags.join(', ') + '"/>';
	html += '<label class="active" for="title">Tags (comma seperated)</label>';
	html += '</div>';
	html += '<textarea id="textarea" placeholder="Content" class="materialize-textarea">' + blog.md + '</textarea>';
	html += '<button id="save" class="btn waves-effect waves-light blue" onclick="saveBlog(' + vindex + ')">Save</button>'
	html += '<a class="btn waves-effect waves-light blue right" href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet" target="_blank">Markdown CheatSheet</a><br><br>'
	html += '<a class="btn-floating page-fab blue btn-large waves-effect waves-light red" onclick="previewBlog()"><i class="material-icons">visibility</i></a>';
	$('main').html(html);
	$('#textarea').trigger('autoresize');
}

function previewBlog(){
	var content = $('#textarea').val();
	content = converter.makeHtml(content);
	var html = '';
	html += '<div class="modal-content">' + content + '<div>';
	$('#modal').html(html).modal('open');
}

function saveBlog(ind){
	var newtitle = $('#title').val();
	var newdesc = $('#description').val();
	var tags = $('#tags').val().split(',');
	var newmd = $('#textarea').val();
	var flag = false;
	try{
		if(newmd.split('\n').join('') != blogList[ind].md.split('\n').join('')
			|| newtitle != eval(blogList[ind].meta.title) 
			|| newdesc != eval(blogList[ind].meta.description))
			flag = true;
	}catch(e){
		if(newmd.split('\n').join('') != blogList[ind].md.split('\n').join('')
			|| newtitle != blogList[ind].meta.title
			|| newdesc != blogList[ind].meta.description)
			flag = true;
	}
	for(var i=0; i<tags; i++){
		tags[i] = tags[i].trim();
		if(tags[i].lenght>0 && blogList[ind].meta.tags.indexOf(tags[i])==-1){
			flag = true;
		}
	}
	if(!flag){
		printBlog(ind);
		return;
	}
	$('main').css('opacity', '0.5');
	blogList[ind].meta.title = newtitle;
	blogList[ind].meta.description = newdesc;
	blogList[ind].meta.tags = tags;
	blogList[ind].md = newmd;
	var content = '---\n';
	content += 'layout: post\n';
	content += 'title: "' + newtitle + '"\n';
	content += 'description: "' + newdesc + '"\n';
	content += 'tags: ["' + tags.join('", "') + '"]\n';
	content += '---\n';
	content += newmd;
	// repo, file, content, message, sha, branch='master', cb
	gh.updateFile(admin_config.repo, admin_config.path + "_posts/" + blogList[ind].name, 
		content,
		"Update " + blogList[ind].name,
		blogList[ind].sha,
		admin_config.branch, function(response){
			if(!response){
				Materialize.toast('Failed!', 3000);
				$('main').css('opacity', '');
				return;
			}
			blogList[vindex].sha = response.content.sha;
			printBlog(vindex);
			Materialize.toast('Saved successfully!', 3000);
			$('main').css('opacity', '');
		});
}

function newBlogDialog(){
	var html = '';
	html += '<div class="modal-content">'
	html += '<h4 class="blue-text">New Blog</h4>'
	html += '<div class="input-field ex-input">';
	html += '<input placeholder="" id="title" type="text" onkeyup="return generateFileName()"/>';
	html += '<label class="active" for="title">Title</label>';
	html += '</div>';
	html += '<div class="input-field ex-input">';
	html += '<input placeholder="" id="description" type="text" />';
	html += '<label class="active" for="description">Description</label>';
	html += '</div>';
	html += '<div class="input-field ex-input">';
	html += '<input placeholder="" id="tags" type="text" />';
	html += '<label class="active" for="tags">Tags (comma seperated)</label>';
	html += '</div>';
	html += '<div class="input-field ex-input">';
	html += '<input placeholder="" id="filename" type="text" />';
	html += '<label class="active" for="filename">Filename</label>';
	html += '</div>';
	html += '</div>';
	html += '<div class="modal-footer">'
	html += '<button class="modal-action waves-effect btn-flat" onclick="createNewBlog()">CREATE</button>';
	html += '</div>'
	$('#modal').html(html).modal().modal('open');
}

function generateFileName(){
	var filename = $('#title').val().trim().toLowerCase();
	filename = filename.split(' ').join('-');
	$('#filename').val(filename);
}

function createNewBlog(){
	$('#modal div').css('opacity',  '0.5');
	var title = $('#title').val();
	var description = $('#description').val();
	var tags = $('#tags').val().split(',');
	var filename = $('#filename').val();
	var content = '---\n';
	content += 'layout: post\n';
	content += 'title: "' + title + '"\n';
	content += 'description: "' + description + '"\n';
	content += 'tags: ["' + tags.join('", "') + '"]\n';
	content += '---\n';
	var t = new Date();
	filename = t.getFullYear() + '-' + (t.getMonth()+1) + '-'
		+ t.getDate() + '-' + filename + '.md';
	// repo, file, content, message, branch='master', cb
	gh.putFile(admin_config.repo, admin_config.path +  '_posts/' + filename, 
		content, "Create " + filename, 
		admin_config.branch, function(response){
			if(!response){
				Materialize.toast('Failed!', 3000);
				$('#modal div').css('opacity', '');
				return;
			}
			var blog = response.content;
			blog.meta = {};
			blog.meta.title = title;
			blog.meta.description = description;
			blog.meta.tags = tags;
			blog.md = '';
			blogList.push(blog);
			vindex = blogList.length - 1;
			editBlog(vindex)
			$('#modal').modal('close');
		});
}

function deleteBlog(vindex){
	var html = '';
	html += '<div class="modal-content">';
	html += 'Are you sure you want to delete blog post <b>'
		 + blogList[vindex].meta.title + '</b>';
	html += '<div class="modal-footer">'
	html += '<a href="#!" class="modal-action modal-close waves-effect waves-green btn-flat" onclick="deleteBlogConfirm(' + vindex + ')">Yes</a>';
	html += '<a href="#!" class="modal-action modal-close waves-effect waves-green btn-flat">No</a>';
	html += '</div>'
	$('#modal').html(html).modal('open');
}

function deleteBlogConfirm(vindex){
	// repo, file, message, sha, branch, cb
	$('main').css('opacity', '0.5');
	gh.deleteFile(admin_config.repo, blogList[vindex].path, 
		'Delete ' + blogList[vindex].name,
		blogList[vindex].sha,
		admin_config.branch, function(response){
			if(!response){
				Materialize.toast('Failed!', 3000);
				$('main').css('opacity', '');
				return;
			}
			getBlogList(admin_config);
		});
}
