/**
 * Yggdrasil — Event Showcase with Timeline & Sorting Game
 * Features: Bubble cards, expandable timeline, node hover, sorting game (no time shown)
 */

(() => {
  // ============================================
  // Configuration
  // ============================================
  const DATA_INDEX = 'data/index.json';
  const DATA_PATH = (file) => `data/${file}`;
  const MAX_TOOLTIP_CLAIMS = 6;

  // ============================================
  // State
  // ============================================
  let allTopics = [];
  let currentTopicData = null;
  let currentGameData = null;
  let correctOrder = [];
  let sortableInstance = null;

  // ============================================
  // DOM References
  // ============================================
  const $eventsBubbles = document.getElementById('eventsBubbles');
  const $eventExpanded = document.getElementById('eventExpanded');
  const $expandedBackdrop = document.getElementById('expandedBackdrop');
  const $expandedClose = document.getElementById('expandedClose');
  const $expandedTopic = document.getElementById('expandedTopic');
  const $expandedMeta = document.getElementById('expandedMeta');
  const $timeline = document.getElementById('timeline');
  const $startGameBtn = document.getElementById('startGameBtn');
  const $nodeTooltip = document.getElementById('nodeTooltip');
  const $nodeTooltipTitle = document.getElementById('nodeTooltipTitle');
  const $nodeTooltipSummary = document.getElementById('nodeTooltipSummary');
  const $nodeTooltipClaims = document.getElementById('nodeTooltipClaims');
  const $gameModal = document.getElementById('gameModal');
  const $gameTitle = document.getElementById('gameTitle');
  const $bucketsList = document.getElementById('bucketsList');
  const $gameClose = document.getElementById('gameClose');
  const $shuffleBtn = document.getElementById('shuffleBtn');
  const $checkBtn = document.getElementById('checkBtn');
  const $gameResult = document.getElementById('gameResult');
  const $scoreValue = document.getElementById('scoreValue');
  const $resultDetail = document.getElementById('resultDetail');

  // ============================================
  // Data Loading
  // ============================================
  async function loadAllTopics() {
    try {
      console.log('Loading index from:', DATA_INDEX);
      const res = await fetch(DATA_INDEX);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const index = await res.json();
      console.log('Loaded index:', index);
      
      // Load all topic data in parallel
      const loadPromises = index.map(async (item) => {
        try {
          const filePath = DATA_PATH(item.file);
          console.log('Loading topic file:', filePath);
          const dataRes = await fetch(filePath);
          if (!dataRes.ok) {
            throw new Error(`HTTP ${dataRes.status}: ${dataRes.statusText}`);
          }
          const data = await dataRes.json();
          console.log('Loaded topic:', item.id, data.topic);
          return { ...item, data };
        } catch (e) {
          console.warn(`Failed to load ${item.file}:`, e);
          return null;
        }
      });

      const results = await Promise.all(loadPromises);
      allTopics = results.filter(Boolean);
      
      console.log('All topics loaded:', allTopics.length);
      
      if (allTopics.length === 0) {
        $eventsBubbles.innerHTML = '<p style="color: var(--text-muted); padding: 40px; text-align: center;">没有加载到任何数据，请检查 data 目录</p>';
        return;
      }
      
      renderEventBubbles();
    } catch (err) {
      console.error('Failed to load topics:', err);
      $eventsBubbles.innerHTML = `<p style="color: var(--text-muted); padding: 40px; text-align: center;">加载数据失败: ${err.message}</p>`;
    }
  }

  // ============================================
  // Render Event Bubbles
  // ============================================
  function renderEventBubbles() {
    $eventsBubbles.innerHTML = allTopics.map((topic, idx) => {
      const data = topic.data;
      const eventCount = data.total_count || data.events.length;
      // Try to load topic image
      const topicImg = `assets/images/${topic.id}.png`; 

      return `
        <div class="event-bubble" data-topic-id="${topic.id}" style="--bubble-idx: ${idx}">
          <div class="bubble-bg" style="background-image: url('${topicImg}')"></div>
          <div class="bubble-content">
            <span class="bubble-index">${String(idx + 1).padStart(2, '0')}</span>
            <span class="bubble-topic">${data.topic}</span>
            <span class="bubble-count">${eventCount} 个子事件</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind events
    $eventsBubbles.querySelectorAll('.event-bubble').forEach(bubble => {
      const topicId = bubble.dataset.topicId;
      const topic = allTopics.find(t => t.id === topicId);

      bubble.addEventListener('click', () => {
        if (topic) openExpandedView(topic);
      });

      // Hover to show claims
      bubble.addEventListener('mouseenter', (e) => {
        if (topic) showTopicClaims(e, topic);
      });

      bubble.addEventListener('mousemove', (e) => {
        positionTooltip(e);
      });

      bubble.addEventListener('mouseleave', () => {
        hideNodeTooltip();
      });
    });
  }

  function showTopicClaims(e, topic) {
    // Collect all claims from all events
    const allClaims = [];
    topic.data.events.forEach(ev => {
      if (ev.C_gold && Array.isArray(ev.C_gold)) {
        allClaims.push(...ev.C_gold);
      }
    });

    // Shuffle and pick random 10-15 claims
    const shuffled = allClaims.sort(() => 0.5 - Math.random()).slice(0, 12);

    $nodeTooltipTitle.textContent = topic.data.topic;
    $nodeTooltipSummary.textContent = `包含 ${topic.data.events.length} 个子事件的完整脉络`;
    
    $nodeTooltipClaims.innerHTML = shuffled.length > 0
      ? shuffled.map(c => `<div class="tooltip-claim">⚡ ${c}</div>`).join('')
      : '<div class="tooltip-claim" style="opacity: 0.6;">暂无原子事实</div>';

    $nodeTooltip.classList.add('visible');
    positionTooltip(e);
  }

  // ============================================
  // Expanded Event View (Timeline)
  // ============================================
  function openExpandedView(topic) {
    currentTopicData = topic.data;
    
    // Set header info
    $expandedTopic.textContent = topic.data.topic;
    $expandedMeta.innerHTML = `
      <span>📄 ${topic.data.total_count || topic.data.events.length} 个子事件</span>
      <span>📦 ${topic.data.ordered_buckets.length} 个时间阶段</span>
    `;

    // Render timeline
    renderTimeline(topic.data, topic.id);

    // Open modal
    $eventExpanded.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeExpandedView() {
    $eventExpanded.classList.remove('open');
    document.body.style.overflow = '';
    currentTopicData = null;
    hideNodeTooltip();
  }

  function renderTimeline(data, topicId) {
    // Flatten buckets to get ordered events
    const orderedEvents = [];
    data.ordered_buckets.forEach(bucket => {
      bucket.event_ids.forEach(eventId => {
        const event = data.events.find(e => e.id === eventId || e.event_id === eventId);
        if (event) {
          orderedEvents.push({ ...event, bucketId: bucket.bucket_id });
        }
      });
    });

    $timeline.innerHTML = orderedEvents.map((event, idx) => {
      // No images for sub-events, use clean card design
      return `
        <div class="timeline-card no-image" 
             data-event-id="${event.id}"
             data-bucket-id="${event.bucketId}"
             style="animation-delay: ${idx * 0.05}s">
          <div class="card-content">
            <div class="card-header">
              <div class="card-date">${event.date}</div>
              <div class="card-bucket-badge">阶段 ${event.bucketId}</div>
            </div>
            <h3 class="card-title">${event.title}</h3>
            <p class="card-summary">${event.summary || ''}</p>
          </div>
        </div>
      `;
    }).join('');

    // Bind hover events for cards
    $timeline.querySelectorAll('.timeline-card').forEach(card => {
      const eventId = parseInt(card.dataset.eventId);
      const eventData = data.events.find(e => e.id === eventId || e.event_id === eventId);

      card.addEventListener('mouseenter', (e) => {
        if (eventData) {
          showEventTooltip(e, eventData);
        }
      });

      card.addEventListener('mousemove', (e) => {
        positionTooltip(e);
      });

      card.addEventListener('mouseleave', () => {
        hideNodeTooltip();
      });
    });
  }

  // ============================================
  // Node Tooltip
  // ============================================
  function showEventTooltip(event, eventData) {
    // Title
    $nodeTooltipTitle.textContent = eventData.title;
    
    // Summary
    $nodeTooltipSummary.textContent = eventData.summary || '暂无摘要';
    
    // Claims
    const claims = eventData.C_gold || [];
    $nodeTooltipClaims.innerHTML = claims.length > 0 
      ? claims.map(c => `<div class="tooltip-claim">${c}</div>`).join('')
      : '<div class="tooltip-claim" style="opacity: 0.6;">暂无原子事实</div>';

    positionTooltip(event);
    $nodeTooltip.classList.add('visible');
  }

  function positionTooltip(event) {
    const tooltipWidth = 360;
    const tooltipHeight = 300;
    let x = event.clientX + 20;
    let y = event.clientY - 20;

    // Keep in viewport
    if (x + tooltipWidth > window.innerWidth - 20) {
      x = event.clientX - tooltipWidth - 20;
    }
    if (y + tooltipHeight > window.innerHeight - 20) {
      y = window.innerHeight - tooltipHeight - 20;
    }
    if (y < 20) {
      y = 20;
    }

    $nodeTooltip.style.left = `${x}px`;
    $nodeTooltip.style.top = `${y}px`;
  }

  function hideNodeTooltip() {
    $nodeTooltip.classList.remove('visible');
  }

  // ============================================
  // Game Modal
  // ============================================
  function openGame() {
    if (!currentTopicData) return;
    
    currentGameData = currentTopicData;
    
    // Build Ground Truth Map: eventId -> bucketId
    // We need this for PO-Acc calculation
    currentGameData.eventBucketMap = new Map();
    currentGameData.ordered_buckets.forEach(b => {
      b.event_ids.forEach(eid => {
        currentGameData.eventBucketMap.set(eid, b.bucket_id);
      });
    });

    $gameTitle.textContent = `🎮 ${currentGameData.topic}`;
    $gameResult.classList.remove('visible');
    $scoreValue.textContent = '—';
    $scoreValue.classList.remove('perfect');

    // Close expanded view first
    closeExpandedView();

    // Render shuffled EVENTS (not buckets)
    shuffleEvents();

    // Open game modal
    $gameModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeGame() {
    $gameModal.classList.remove('open');
    document.body.style.overflow = '';
    currentGameData = null;
    
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
  }

  function shuffleEvents() {
    if (!currentGameData) return;

    // Collect all events that are in buckets
    let events = [];
    currentGameData.ordered_buckets.forEach(b => {
      b.event_ids.forEach(eid => {
        const ev = currentGameData.events.find(e => e.id === eid || e.event_id === eid);
        if (ev) events.push(ev);
      });
    });

    // Shuffle
    for (let i = events.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [events[i], events[j]] = [events[j], events[i]];
    }

    renderGameEvents(events);
    $gameResult.classList.remove('visible');
  }

  function renderGameEvents(events) {
    $bucketsList.innerHTML = events.map(ev => `
      <div class="bucket-item event-item" data-event-id="${ev.id}">
        <span class="bucket-handle">⋮⋮</span>
        <div class="bucket-content">
          <div class="bucket-desc">${ev.title}</div>
        </div>
      </div>
    `).join('');

    // Initialize SortableJS
    if (sortableInstance) {
      sortableInstance.destroy();
    }

    sortableInstance = Sortable.create($bucketsList, {
      animation: 200,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      handle: '.bucket-item'
    });
  }

  // ============================================
  // Check Answer & Calculate PO-Accuracy
  // ============================================
  function checkAnswer() {
    if (!currentGameData) return;

    const userOrderIds = Array.from($bucketsList.querySelectorAll('.bucket-item'))
      .map(el => parseInt(el.dataset.eventId));

    // Calculate PO-Accuracy (Partial Order Accuracy)
    // Formula: Only consider pairs (u, v) where Bucket(u) < Bucket(v) in GT.
    // If user placed u before v, it's correct.
    
    let strictPairsCount = 0;
    let correctPairsCount = 0;
    const map = currentGameData.eventBucketMap;

    // Iterate all pairs in user's list to check consistency with GT
    // But PO-Acc definition is usually: iterate all strict pairs in GT, check if User respects them.
    // Let's iterate all pairs in the user list and check against GT strict order.
    
    // Actually, let's follow the definition: 
    // "StrictPairs = {(u,v) | u in Bi, v in Bj, i < j}"
    // We iterate through the user's list to see the relative order of u and v.
    
    // Optimization: Iterate all pairs in User List.
    // If GT says u < v (strict), then this pair contributes to StrictPairs.
    // If User also has u < v, then Correct++.
    // If User has v < u, then Incorrect.
    
    // Wait, we need to iterate all possible pairs of events.
    const n = userOrderIds.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u = userOrderIds[i];
        const v = userOrderIds[j];
        
        const bucketU = map.get(u);
        const bucketV = map.get(v);
        
        // Check if there is a strict order in GT
        if (bucketU !== bucketV) {
          // There is a strict order.
          // Since we are iterating user list i < j, user says u comes before v.
          
          if (bucketU < bucketV) {
            // GT says u < v. User says u < v. Match!
            strictPairsCount++;
            correctPairsCount++;
          } else if (bucketU > bucketV) {
            // GT says v < u. User says u < v. Mismatch.
            strictPairsCount++;
            // correctPairsCount does not increment
          }
        }
      }
    }

    const accuracy = strictPairsCount > 0 ? correctPairsCount / strictPairsCount : 0;
    const percentage = Math.round(accuracy * 100);

    // Display result
    $scoreValue.textContent = `${percentage}%`;
    $scoreValue.classList.toggle('perfect', percentage === 100);

    if (percentage === 100) {
      $resultDetail.textContent = `🎉 完美！PO-Accuracy 达到 100%！`;
    } else {
      $resultDetail.textContent = `在 ${strictPairsCount} 对严格时序关系中，你答对了 ${correctPairsCount} 对`;
    }

    $gameResult.classList.add('visible');
    
    // Highlight logic is tricky for PO, maybe just flash the score
  }

  function highlightResults(userOrder) {
    // Deprecated for PO-Acc as it's pairwise
  }

  // ============================================
  // Event Listeners
  // ============================================
  function setupEventListeners() {
    // Expanded view close
    $expandedClose.addEventListener('click', closeExpandedView);
    $expandedBackdrop.addEventListener('click', closeExpandedView);

    // Start game button
    $startGameBtn.addEventListener('click', openGame);

    // Game close
    $gameClose.addEventListener('click', closeGame);
    $gameModal.addEventListener('click', (e) => {
      if (e.target === $gameModal) closeGame();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if ($gameModal.classList.contains('open')) {
          closeGame();
        } else if ($eventExpanded.classList.contains('open')) {
          closeExpandedView();
        }
      }
    });

    // Game buttons
    $shuffleBtn.addEventListener('click', shuffleEvents);
    $checkBtn.addEventListener('click', checkAnswer);
  }

  // ============================================
  // Initialize
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAllTopics();
  });
})();
