(function () {
  let isClaiming = false; // Флаг для предотвращения повторных кликов

  // Функция для проверки цвета кнопки
  function isButtonGreen(button) {
    const style = window.getComputedStyle(button);
    const backgroundColor = style.backgroundColor;
    return backgroundColor.includes("rgb(76, 175, 80)") || backgroundColor.includes("rgba(76, 175, 80");
  }

  // Функция для проверки видимости элемента
  function isElementVisible(element) {
    return element.offsetWidth > 0 && element.offsetHeight > 0 && getComputedStyle(element).display !== "none";
  }

  // Функция для поиска и клика по кнопке
  function claimReward() {
    if (isClaiming) return; // Предотвращаем повторные клики

    try {
      // Находим все кнопки на странице
      const buttons = document.querySelectorAll('button');

      for (const button of buttons) {
        // Способ 1: Ищем по aria-label
        if (button.getAttribute("aria-label") === "Получить бонус") {
          console.log("Кнопка найдена по aria-label.");
          handleButton(button);
          return;
        }

        // Способ 2: Ищем по data-a-target
        if (button.getAttribute("data-a-target") === "reward-cta") {
          console.log("Кнопка найдена по data-a-target.");
          handleButton(button);
          return;
        }

        // Способ 3: Ищем зеленую кнопку под чатом
        if (isElementVisible(button) && isButtonGreen(button)) {
          const chatInput = document.querySelector('.ScChatInput-sc-1f9e2gu-1'); // Актуальный селектор поля чата

          if (chatInput && button.getBoundingClientRect().top > chatInput.getBoundingClientRect().bottom) {
            console.log("Зеленая кнопка найдена под чатом.");
            handleButton(button);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Ошибка при поиске кнопки:", error);
    }
  }

  // Обработка найденной кнопки
  function handleButton(button) {
    if (isClaiming) return;

    isClaiming = true; // Устанавливаем флаг
    console.log("Попытка получить награду...");
    button.click();

    setTimeout(() => {
      console.log("Клик выполнен. Добавляем +50 баллов.");

      // Отправляем сообщение в background.js с фиксированным значением +50
      chrome.runtime.sendMessage({ action: "rewardClaimed", amount: 50 }).catch(() => {
        console.warn("Не удалось отправить сообщение в background.js. Возможно, popup закрыт.");
      });

      // Сбрасываем флаг через небольшой таймаут
      setTimeout(() => {
        isClaiming = false;
      }, 3000); // Ждем 3 секунды перед следующим кликом
    }, 1000); // Добавляем задержку после клика
  }

  // Мутационный наблюдатель для отслеживания изменений в DOM
  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      try {
        // При каждом изменении DOM проверяем наличие кнопки
        claimReward();
      } catch (error) {
        console.error("Ошибка при работе наблюдателя:", error);
      }
    });

    // Наблюдаем за всеми изменениями в документе
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Проверяем кнопку при первоначальной загрузке страницы
  claimReward();

  // Устанавливаем мутационный наблюдатель
  setupMutationObserver();

  // Дополнительная проверка каждые 5 секунд (на случай, если кнопка появляется позже)
  setInterval(claimReward, 5000);
})();