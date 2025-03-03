let isEnabled = false;
let rewardCount = 0;
let currentChannel = "Не выбран";
let rewardHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggleButton");
  const statusText = document.getElementById("status");
  const rewardCounterElement = document.getElementById("rewardCounter");
  const activeChannelElement = document.getElementById("activeChannel"); // Элемент названия канала
  const rewardHistoryBody = document.getElementById("rewardHistoryBody");
  const resetButton = document.getElementById("resetButton"); // Кнопка сброса

  // Загружаем текущее состояние, счётчик и историю из хранилища
  chrome.storage.sync.get(["enabled", "rewardCount", "currentChannel", "rewardHistory"], (data) => {
    isEnabled = data.enabled || false;
    rewardCount = data.rewardCount || 0;
    currentChannel = data.currentChannel || "Не выбран";
    rewardHistory = data.rewardHistory || [];
    updateUI();
    renderRewardHistory();
  });

  // Обработчик клика на кнопку включения/выключения
  toggleButton.addEventListener("click", () => {
    isEnabled = !isEnabled;

    // Отправляем сообщение в background.js и обновляем состояние
    chrome.runtime.sendMessage({ action: "toggle", state: isEnabled }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при отправке сообщения:", chrome.runtime.lastError.message);
      } else if (!response) {
        console.warn("Ответ от background.js не получен.");
      } else {
        console.log("Ответ от background.js:", response);

        if (response.success) {
          isEnabled = response.state;
          updateUI();
        }
      }
    });
  });

  // Обработчик клика на кнопку сброса
  resetButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetCounter" }, () => {
      console.log("Счётчик и история наград сброшены.");
      rewardCount = 0;
      rewardHistory = [];
      updateUI();
      renderRewardHistory();
    });
  });

  // Функция для обновления интерфейса
  function updateUI() {
    if (isEnabled) {
      toggleButton.textContent = "Выключить";
      statusText.textContent = "Статус: Включен";
    } else {
      toggleButton.textContent = "Включить";
      statusText.textContent = "Статус: Выключен";
    }

    // Обновляем значение счётчика
    rewardCounterElement.textContent = `Наград собрано: ${rewardCount}`;

    // Обновляем активный канал с ссылкой
    if (currentChannel !== "Не выбран") {
      activeChannelElement.innerHTML = `<a href="https://www.twitch.tv/${currentChannel}" target="_blank">${currentChannel}</a>`;
    } else {
      activeChannelElement.textContent = "Не выбран";
    }
  }

  // Функция для отрисовки таблицы с историей наград
  function renderRewardHistory() {
    rewardHistoryBody.innerHTML = ""; // Очищаем таблицу

    rewardHistory.forEach((entry, index) => {
      const row = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = entry.date;

      const rewardsCell = document.createElement("td");
      rewardsCell.textContent = entry.rewards;

      row.appendChild(dateCell);
      row.appendChild(rewardsCell);
      rewardHistoryBody.appendChild(row);
    });
  }

  // Обработчик сообщений от background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.action === "updateRewardCount") {
        rewardCount = message.count;
        updateUI();
      } else if (message.action === "updateChannelName") {
        currentChannel = message.channel;
        updateUI();
      } else if (message.action === "updateRewardHistory") {
        rewardHistory = message.history;
        renderRewardHistory();
      }
    } catch (error) {
      console.error("Ошибка при обработке сообщения:", error);
    }
  });
});