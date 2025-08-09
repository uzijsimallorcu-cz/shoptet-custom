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


// SLIDER PRODUKTŮ DO ČLÁNKŮ
(function($){
  function initArticleSlider($root){
    if ($root.data('ready')) return;

    var $items = $root.children('.article-product');
    var $viewport = $('<div class="article-slider__viewport"/>');
    var $track    = $('<div class="article-slider__track"/>');
    $items.appendTo($track);
    $viewport.append($track);
    $root.append($('<button class="article-slider__nav article-slider__nav--prev" type="button" data-icon="‹"></button>'));
    $root.append($viewport);
    $root.append($('<button class="article-slider__nav article-slider__nav--next" type="button" data-icon="›"></button>'));

    var state = {
      $root, $viewport, $track,
      $items: $track.children('.article-product'),
      gap: parseFloat(getComputedStyle($track[0]).gap) || 12,
      spv: 1,
      index: 0,
      clones: 0,
      anim: false
    };

    function calcSpv(){
      var ww = $root.outerWidth();
      if (window.matchMedia('(max-width: 767px)').matches){
        return Math.min(2, state.$items.length || 1);
      } else {
        var n = Math.floor((ww + state.gap) / (250 + state.gap));
        n = Math.max(1, Math.min(4, n));
        n = Math.min(n, state.$items.length || n);
        return n;
      }
    }

    function setSizes(){
      state.spv = calcSpv();
      var vw = state.$viewport.innerWidth();
      var slideW = Math.max(0, Math.floor((vw - state.gap*(state.spv-1)) / state.spv));
      state.$track.children().css('width', slideW+'px');
    }

    function makeInfinite(){
      state.$track.find('.is-clone').remove();
      state.clones = state.spv;
      var $first = state.$items.slice(0, state.clones).clone(true).addClass('is-clone');
      var $last  = state.$items.slice(-state.clones).clone(true).addClass('is-clone');
      state.$track.prepend($last);
      state.$track.append($first);
      state.index = state.clones;
      jumpTo(state.index);
    }

    function positionArrows(){
      var isDesktop = window.matchMedia('(min-width:768px)').matches;
      var $prev = $root.find('.article-slider__nav--prev');
      var $next = $root.find('.article-slider__nav--next');

      if(!isDesktop){
        $prev.css({ left:'', right:'' });
        $next.css({ left:'', right:'' });
        return;
      }

      var vpLeft  = state.$viewport.position().left;
      var vpRight = vpLeft + state.$viewport.outerWidth();
      var btnW = $next.outerWidth();
      var offset = 15;

      $next.css({
        left: (vpRight + offset - btnW/2) + 'px',
        right: 'auto'
      });

      $prev.css({
        left: (vpLeft - offset - btnW/2) + 'px',
        right: 'auto'
      });
    }

    function updateAll(){
      setSizes();
      makeInfinite();
      positionArrows();
    }

    function translateTo(i, animate){
      if (state.anim) return;
      state.anim = true;
      state.$track.css('transition', animate !== false ? 'transform 350ms ease' : 'none');
      var slide = state.$track.children().eq(0);
      var slideW = slide.outerWidth();
      var x = -i * (slideW + state.gap);
      state.$track.css('transform','translateX('+x+'px)');
      setTimeout(function(){ state.anim = false; }, 360);
    }
    function jumpTo(i){ translateTo(i, false); }

    function next(){ state.index++; translateTo(state.index, true); }
    function prev(){ state.index--; translateTo(state.index, true); }

    state.$track.on('transitionend', function(){
      var total = state.$items.length;
      if (state.index >= total + state.clones){
        state.index -= total;
        jumpTo(state.index);
      } else if (state.index < state.clones){
        state.index += total;
        jumpTo(state.index);
      }
    });

    $root.on('click', '.article-slider__nav--next', next);
    $root.on('click', '.article-slider__nav--prev', prev);

    var startX = null;
    $viewport.on('touchstart', function(e){
      startX = e.originalEvent.touches[0].clientX;
    });
    $viewport.on('touchend', function(e){
      if (startX == null) return;
      var endX = e.originalEvent.changedTouches[0].clientX;
      var dx = endX - startX;
      if (Math.abs(dx) > 40){
        if (dx < 0) next(); else prev();
      }
      startX = null;
    });

    updateAll();
    var rid = null;
    $(window).on('resize', function(){
      if (rid) clearTimeout(rid);
      rid = setTimeout(function(){
        updateAll();
      }, 120);
    });

    $root.data('ready', true);
  }

  $(function(){
    $('.article-column + .article-slider, .article-slider').each(function(){
      initArticleSlider($(this));
    });
  });
})(jQuery);


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
