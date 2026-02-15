const monthNames = [
      "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
      "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
    ];

    const sliderStart = new Date(2026, 0, 1); // leden 2026
    const totalMonths = 13; // leden 2026 až leden 2027
    let currentMonthIndex = 0;
    let lastOpenedUrl = null;

    const calendarGrid = $("#calendarGrid");
    const monthLabel = $("#monthLabel");

    function parseEventDefinitions() {
      const eventsByDate = {};
      $("#eventDefinitions li").each(function () {
        const start = $(this).data("start");
        const end = $(this).data("end") || start;
        const title = $(this).data("title") || $(this).text().trim();
        const url = $(this).data("url");

        if (!start) return;

        const startDate = new Date(start);
        const endDate = new Date(end);

        for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
          const dateKey = formatDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
          if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
          eventsByDate[dateKey].push({ text: title, url });
        }
      });
      return eventsByDate;
    }

    const presetEvents = parseEventDefinitions();

    function formatDateKey(year, month, day) {
      const m = month.toString().padStart(2, "0");
      const d = day.toString().padStart(2, "0");
      return `${year}-${m}-${d}`;
    }

    function createItem(text, url) {
      const item = $("<div class='cell-item'></div>").text(text);
      if (url) {
        item.attr("data-url", url);
      }
      return item;
    }

    function renderMonth(index) {
      const current = new Date(sliderStart.getFullYear(), sliderStart.getMonth() + index, 1);
      const startOffset = (current.getDay() + 6) % 7; // převod na pondělí jako první den

      monthLabel.text(`${monthNames[current.getMonth()]} ${current.getFullYear()}`);
      calendarGrid.empty();
      for (let row = 0; row < 6; row++) {
        const rowEl = $("<div class='calendar-row'></div>");
        for (let col = 0; col < 7; col++) {
          const cellIndex = row * 7 + col;
          const cellDate = new Date(
            current.getFullYear(),
            current.getMonth(),
            cellIndex - startOffset + 1
          );
          const isCurrentMonth = cellDate.getMonth() === current.getMonth();
          const cell = $("<div class='calendar-cell'></div>");
          const dateKey = formatDateKey(
            cellDate.getFullYear(),
            cellDate.getMonth() + 1,
            cellDate.getDate()
          );
          cell.attr("data-date", dateKey);

          if (!isCurrentMonth) {
            cell.addClass("adjacent-month");
          }

          const content = $("<div class='cell-content'></div>");
          const dayEvents = presetEvents[dateKey] || [];

          const dateHeader = $("<div class='date-header'></div>");
          dateHeader.append(`<div class='date-number'>${cellDate.getDate()}</div>`);
          if (dayEvents.length) {
            dateHeader.append(`<span class='event-count'>${dayEvents.length}×</span>`);
          }
          content.append(dateHeader);

          const itemsWrapper = $("<div class='cell-items'></div>");
          if (dayEvents.length) {
            dayEvents.forEach(ev => itemsWrapper.append(createItem(ev.text, ev.url)));
          }

          content.append(itemsWrapper);
          cell.append(content);
          rowEl.append(cell);
        }
        calendarGrid.append(rowEl);
      }
      updateArrows();
    }

    function updateArrows() {
      $("#prevMonth").prop("disabled", currentMonthIndex === 0);
      $("#nextMonth").prop("disabled", currentMonthIndex === totalMonths - 1);
    }

    function buildFrameDocument(contentHTML, sourceUrl) {
      const base = sourceUrl || location.href;
      return `<!DOCTYPE html>
        <html lang="cs">
          <head>
            <base href="${base}">
            <meta charset="UTF-8" />
            <style>
              body { margin: 0; padding: 20px; font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; line-height: 1.6; background: #ffffff; color: #0f172a; }
              a { color: #1a73e8; }
              img, video, iframe { max-width: 100%; height: auto; }
              main { max-width: 960px; margin: 0 auto; }
            </style>
          </head>
          <body>${contentHTML}</body>
        </html>`;
    }

    function openPopup(url) {
      if (!url) return;
      lastOpenedUrl = url;
      $("#openArticle").prop("disabled", false);
      const frame = $("#popupFrame");
      frame.removeAttr("src").attr("srcdoc", buildFrameDocument("<p>Načítám obsah…</p>", url));
      $("#popupOverlay").addClass("visible");

      fetch(url)
        .then(resp => resp.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const mainContent = doc.querySelector("main#content");
          const bodyContent = mainContent ? mainContent.outerHTML : doc.body.innerHTML;
          frame.attr("srcdoc", buildFrameDocument(bodyContent, url));
        })
        .catch(() => {
          frame.attr("srcdoc", buildFrameDocument(`<p>Obsah se nepodařilo načíst. <a href='${url}' target='_blank' rel='noopener'>Otevřít v novém okně</a></p>`, url));
        });
    }

    function closePopup() {
      $("#popupFrame").attr({ src: "about:blank", srcdoc: "" });
      $("#popupOverlay").removeClass("visible");
      lastOpenedUrl = null;
      $("#openArticle").prop("disabled", true);
    }

    $("#prevMonth").on("click", () => {
      if (currentMonthIndex > 0) {
        currentMonthIndex -= 1;
        renderMonth(currentMonthIndex);
      }
    });

    $("#nextMonth").on("click", () => {
      if (currentMonthIndex < totalMonths - 1) {
        currentMonthIndex += 1;
        renderMonth(currentMonthIndex);
      }
    });

    calendarGrid.on("click", ".cell-item", function (event) {
      event.stopPropagation();
      openPopup($(this).data("url"));
    });

    calendarGrid.on("click", ".calendar-cell", function () {
      if (window.matchMedia("(max-width: 768px)").matches) {
        $(this).closest(".calendar-row").find(".calendar-cell").removeClass("expanded");
        $(this).addClass("expanded");
      }
    });

    $("#closePopup, #popupOverlay").on("click", function (event) {
      if (event.target.id === "popupOverlay" || event.target.id === "closePopup") {
        closePopup();
      }
    });

    $("#openArticle").on("click", function () {
      if (lastOpenedUrl) {
        window.open(lastOpenedUrl, "_blank", "noopener");
      }
    });

    $(document).on("keydown", function (event) {
      if (event.key === "Escape") {
        closePopup();
      }
    });

    // inicializace
    renderMonth(currentMonthIndex);
