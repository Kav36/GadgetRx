(function() {
    Pusher.logToConsole = true;
  
    var serverUrl = "http://localhost:3000/",
        pusher = new Pusher('a2f11745d379fc8f0ecd', {
            cluster: 'ap2',
            encrypted: true
        }),
        channel = pusher.subscribe('flash-comments'),
        commentForm = document.getElementById('comment-form'),
        commentsList = document.getElementById('comments-list'),
        commentTemplate = document.getElementById('comment-template'),
        shopIdInput = document.getElementById('shop_id');
  
    var recentlyAddedComments = new Set();
  
    channel.bind('new_comment', newCommentReceived);
    channel.bind('delete_comment', deleteCommentReceived);
  
    commentForm.addEventListener("submit", addNewComment);
    shopIdInput.addEventListener("change", fetchCommentsForShop);
  
    function fetchCommentsForShop() {
        var shopId = shopIdInput.value;
        var personId = document.getElementById('person_id').value;
  
        var xhr = new XMLHttpRequest();
        xhr.open("GET", `${serverUrl}comments/${shopId}?person_id=${personId}`, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4 || xhr.status != 200) return;
  
            commentsList.innerHTML = '';
            var fetchedComments = JSON.parse(xhr.responseText);
            fetchedComments.forEach(function(comment) {
                appendComment(comment);
            });
        };
        xhr.send();
    }
  
    function appendComment(data) {
        if (recentlyAddedComments.has(data.id)) {
            recentlyAddedComments.delete(data.id);
            return;
        }
  
        var newCommentHtml = commentTemplate.innerHTML
            .replace('{{name}}', data.person_id)
            .replace('{{comment}}', data.comment)
            .replace(/{{comment_id}}/g, data.id)
            .replace('{{#if isOwner}}', data.isOwner ? '' : '<!--')
            .replace('{{/if}}', data.isOwner ? '' : '-->');
        var newCommentNode = document.createElement('div');
        newCommentNode.classList.add('comment');
        newCommentNode.innerHTML = newCommentHtml;
        commentsList.appendChild(newCommentNode);
    }
  
    function newCommentReceived(data) {
        var currentShopId = shopIdInput.value;
        if (data.shop_id != currentShopId) {
            return;
        }
        appendComment(data);
    }
  
    function deleteCommentReceived(data) {
        var commentId = data.comment_id;
        var commentElement = document.querySelector('[data-comment-id="' + commentId + '"]');
        if (commentElement) {
            commentElement.remove();
        }
    }
  
    function addNewComment(event) {
        event.preventDefault();
        var personId = document.getElementById('person_id').value;
        var shopId = shopIdInput.value;
        var newComment = {
            "person_id": personId,
            "shop_id": shopId,
            "comment": document.getElementById('new_comment_text').value
        };
  
        var xhr = new XMLHttpRequest();
        xhr.open("POST", serverUrl + "comment", true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4 || xhr.status != 200) return;
  
            var createdComment = JSON.parse(xhr.responseText);
            recentlyAddedComments.add(createdComment.id);
            appendComment(createdComment);
            commentForm.reset();
        };
        xhr.send(JSON.stringify(newComment));
    }
  
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-comment')) {
            var commentId = event.target.getAttribute('data-comment-id');
            deleteComment(commentId);
        }
        if (event.target.closest('.delete-comment')) {
            var commentId = event.target.closest('.delete-comment').getAttribute('data-comment-id');
            deleteComment(commentId);
        }
    });
  
    function deleteComment(commentId) {
        var personId = document.getElementById('person_id').value;
  
        var xhr = new XMLHttpRequest();
        xhr.open("POST", serverUrl + "delete-comment", true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4 || xhr.status != 200) return;
  
            console.log("Comment deleted: " + xhr.responseText);
            removeCommentFromUI(commentId);
        };
        xhr.send(JSON.stringify({ comment_id: commentId, person_id: personId }));
    }
  
    function removeCommentFromUI(commentId) {
        var commentElement = document.querySelector('[data-comment-id="' + commentId + '"]');
        if (commentElement) {
            commentElement.remove();
        }
    }
  
    window.addEventListener('DOMContentLoaded', fetchCommentsForShop);
  })();
  
  