// Jednoduché přesunutí prvků
$(".welcome-wrapper").insertAfter(".carousel-wrapper");
$(".homepage-group-title.homepage-products-heading-4.h4").insertAfter(".full-width.homepage-banners-full-width.middle-banners");
$(".products-wrapper.product-slider-holder.has-navigation").insertAfter(".homepage-group-title.homepage-products-heading-4.h4");
$(document).ready(function(){
  $(".flip").click(function(){
    $(this).next(".panel").slideToggle("slow");
  });
});

// Seznam rubrik v článku
setTimeout(function() {
  if ($("#heading-0").length && $(".rubrics").length) {
    $(".rubrics").insertAfter("#heading-0");
  } else {
    console.warn("Prvky nebyly nalezeny.");
  }
}, 500);


// OBSAH WIDGET
$(document).ready(function() {
  // Ověř, že na stránce je <article>
  const $article = $('article');
  if ($article.length === 0) {
    $('#toc-widget').remove(); // nebo .hide()
    return; // Ukonči skript
  }
  const $tocList = $('#toc-content ul');
  // Najdi všechny H1-H3 uvnitř článku
  $article.find('h1, h2, h3').each(function(index) {
    const $heading = $(this);
    const tag = $heading.prop('tagName').toLowerCase();
    const text = $heading.text();
    const id = 'heading-' + index;
    // Přidej ID, pokud chybí
    if (!$heading.attr('id')) {
      $heading.attr('id', id);
    }
    const li = $('<li></li>')
      .addClass('toc-' + tag)
      .append(`<a href="#${$heading.attr('id')}">${text}</a>`);

    $tocList.append(li);
  });
  // Toggle otevření widgetu
  $('#toc-toggle').on('click', function() {
    $('#toc-widget').toggleClass('open');
  });
  $('#toc-widget').show();
});

// ZVÝRAZĚNÍ AKTUÁLNÍHO MĚSÍCE – článek počasí
$(document).ready(function () {
  // Měsíce v češtině ve správném pořadí
  const mesice = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  // Získání aktuálního měsíce (index 0–11)
  const aktualniMesicIndex = new Date().getMonth();
  const aktualniMesic = mesice[aktualniMesicIndex];

  // Projdi každý .weather-month a hledej ten správný
  $(".weather-month").each(function () {
    const text = $(this).text();

    if (text.includes(aktualniMesic)) {
      // Odeber případné staré highlighty a nastav nový
      $(".weather-month").removeClass("highlight");
      $(this).addClass("highlight");
    }
  });
});
