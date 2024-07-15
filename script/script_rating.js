$(document).ready(function() {
    

    // Highlight selected star and save rating
    $('.star').on('click', function() {
        const rating = $(this).val();
        const personId = $('#person_id').val();
        const shopId = $('#shop_id').val();
        if (personId && shopId) {
            saveRating(personId, shopId, rating);
            $('.star').removeClass('selected');
            $(this).next('label').addClass('selected');
            $(this).prevAll('.star').next('label').addClass('selected');
        } else {
            alert('Please enter both Person ID and Shop ID first');
        }
    });

    
    function loadRating(personId, shopId) {
        console.log("load"+personId,shopId);
        $.ajax({
            url: `http://localhost:3000/load_rating?person_id=${personId}&shop_id=${shopId}`,
            method: 'GET',
            success: function(response) {
                const rating = response.rating;
                $('.star').prop('checked', false).next('label').removeClass('selected');
                if (rating) {
                    $(`input[name="rating"][value="${rating}"]`).prop('checked', true).next('label').addClass('selected');
                    $('.myratings').text(rating).css('color', rating < 3 ? 'red' : 'green');
                } else {
                    $('.myratings').text(0).css('color', 'black');
                }
            },
            error: function(error) {
                console.error('Error loading rating:', error);
            }
        });
    }

    // Save rating for given person ID and shop ID
    function saveRating(personId, shopId, rating) {
        const formData = {
            person_id: personId,
            shop_id: shopId,
            stars: rating
        };
console.log(formData);
        $.ajax({
            url: 'http://localhost:3000/save_rating',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                console.log('Rating saved successfully');
            },
            error: function(error) {
                console.error('Error saving rating:', error);
            }
        });
    }

    const personId = $('#person_id').val();
    const shopId = $('#shop_id').val();
    if (personId && shopId) {
        loadRating(personId, shopId);
    }
});
$(document).ready(function () {
    $("input[type='radio']").click(function () {
        var rating = $("input[type='radio']:checked").val();
        if (rating < 3) {
            $('.myratings').css('color', 'red');
        } else {
            $('.myratings').css('color', 'green');
        }
        $(".myratings").text(rating);
    });
});