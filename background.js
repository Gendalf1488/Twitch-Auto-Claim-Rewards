let isEnabled = false;

// Загружаем состояние и данные из хранилища при старте
chrome.storage.sync.get(["enabled", "rewardCount", "currentChannel", "rewardHistory"], (data) => {
  isEnabled = data.enabled || false;
  let rewardCount = data.rewardCount || 0;
  let currentChannel = data.currentChannel || "Не выбран";
  let rewardHistory = data.rewardHistory || [];
  console.log(`Загружено состояние: ${isEnabled}, счётчик: ${rewardCount}, канал: ${currentChannel}`);
});

// Обработка сообщений от popup и content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === "toggle") {
      isEnabled = message.state;

      // Сохраняем новое состояние
      chrome.storage.sync.set({ enabled: isEnabled }, () => {
        console.log(`Состояние изменено на: ${isEnabled}`);

        if (!isEnabled) {
          // Если расширение выключается, сохраняем историю наград
          saveRewardHistory();
        }

        if (isEnabled) {
          startClaiming();
        } else {
          stopClaiming();
        }

        sendResponse({ success: true, state: isEnabled });
      });

      return true; // Возвращаем true для асинхронного ответа
    } else if (message.action === "rewardClaimed") {
      // Обновляем счётчик наград с фиксированным значением +50
      updateRewardCount(message.amount);
    } else if (message.action === "resetCounter") {
      // Сброс счётчика и истории наград
      resetRewardCounter();
    }
  } catch (error) {
    console.error("Ошибка при обработке сообщения:", error);
  }

  return true; // Возвращаем true для асинхронного ответа
});

// Начинаем сборку наград
function startClaiming() {
  console.log("Автоматический сборщик наград включен.");
  checkActiveTabForRewards();
}

// Останавливаем сборку наград
function stopClaiming() {
  console.log("Автоматический сборщик наград выключен.");
}

// Проверяем активную вкладку на наличие Twitch-страницы
function checkActiveTabForRewards() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && tabs[0].url.includes("twitch.tv")) {
      console.log("Twitch-страница обнаружена. Запускаем content.js...");

      // Извлекаем название канала из URL
      const channelName = extractChannelName(tabs[0].url);

      // Сохраняем название канала в хранилище
      chrome.storage.sync.set({ currentChannel: channelName }, () => {
        console.log(`Канал обновлен: ${channelName}`);

        // Отправляем сообщение в popup для обновления интерфейса
        sendMessageToPopup({ action: "updateChannelName", channel: channelName });
      });

      // Выполняем content.js на активной вкладке
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["content.js"]
      }).catch((error) => {
        console.error("Ошибка при выполнении content.js:", error);
      });
    }
  });
}

// Функция для извлечения названия канала
function extractChannelName(url) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(part => part);

    if (pathParts.length >= 2) {
      return pathParts[1];
    }

    if (pathParts.length === 1) {
      return pathParts[0];
    }
  } catch (error) {
    console.error("Ошибка при извлечении названия канала:", error);
  }

  return "Не выбран";
}

// Обновляем счётчик наград
function updateRewardCount(amount) {
  chrome.storage.sync.get(["rewardCount"], (data) => {
    let currentCount = data.rewardCount || 0;
    currentCount += amount;

    // Сохраняем обновленный счётчик
    chrome.storage.sync.set({ rewardCount: currentCount }, () => {
      console.log(`Счётчик обновлен: +${amount}. Текущее значение: ${currentCount}`);

      // Отправляем сообщение в popup для обновления интерфейса
      sendMessageToPopup({ action: "updateRewardCount", count: currentCount });
    });
  });
}

// Сохраняем историю наград после завершения стрима/выключения расширения
function saveRewardHistory() {
  chrome.storage.sync.get(["rewardCount", "rewardHistory"], (data) => {
    let currentCount = data.rewardCount || 0;
    let rewardHistory = data.rewardHistory || [];

    if (currentCount > 0) {
      const today = formatDate(new Date());

      // Находим или создаем запись за текущий день
      const existingEntry = rewardHistory.find(entry => entry.date === today);

      if (existingEntry) {
        existingEntry.rewards += currentCount; // Обновляем существующую запись
      } else {
        rewardHistory.unshift({ date: today, rewards: currentCount }); // Создаем новую запись
      }

      // Оставляем только последние 7 дней
      if (rewardHistory.length > 7) {
        rewardHistory.pop();
      }

      // Сбрасываем счётчик и сохраняем обновленную историю
      chrome.storage.sync.set({ rewardCount: 0, rewardHistory }, () => {
        console.log("История наград обновлена.");

        // Отправляем сообщение в popup для обновления интерфейса
        sendMessageToPopup({ action: "updateRewardHistory", history: rewardHistory });
      });
    }
  });
}

// Сброс счётчика и истории наград
function resetRewardCounter() {
  chrome.storage.sync.set({ rewardCount: 0, rewardHistory: [] }, () => {
    console.log("Счётчик и история наград сброшены.");

    // Отправляем сообщение в popup для обновления интерфейса
    sendMessageToPopup({ action: "updateRewardCount", count: 0 });
    sendMessageToPopup({ action: "updateRewardHistory", history: [] });
  });
}

// Форматирование даты в формат "день/месяц/год"
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Отправляем сообщение в popup с защитой от ошибок
function sendMessageToPopup(message) {
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      console.warn("Не удалось отправить сообщение в popup. Возможно, popup закрыт.");
    });
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error.message);
  }
}

// Периодическая проверка каждые 5 секунд
setInterval(() => {
  if (isEnabled) {
    checkActiveTabForRewards();
  }
}, 5000);