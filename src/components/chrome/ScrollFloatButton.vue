<template>
    <Teleport to="body">
        <div
            class="scroll-float-wrap"
            :class="{ 'scroll-float-visible': floatVisible }"
            aria-hidden="true"
        >
            <button
                type="button"
                class="scroll-float-btn"
                :class="nearBottom ? 'scroll-to-top' : 'scroll-to-bottom'"
                :aria-label="t('scrollAria')"
                :title="nearBottom ? t('scrollTop') : t('scrollBottom')"
                @click="onClick"
            ></button>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const floatVisible = ref(false);
const nearBottom = ref(false);

let resizeObs = null;
let resizeObserveTarget = null;
let scrollListenEl = null;
let scrollOnWindow = false;

function getScrollMetrics() {
    const cm = document.getElementById('contentMain');
    const scrollHeight = cm ? cm.scrollHeight : document.documentElement.scrollHeight;
    const scrollTop = cm ? cm.scrollTop : document.documentElement.scrollTop || window.scrollY;
    const clientHeight = cm ? cm.clientHeight : window.innerHeight;
    return { cm, scrollHeight, scrollTop, clientHeight };
}

function updateVisibility() {
    const { scrollHeight, scrollTop, clientHeight } = getScrollMetrics();
    const overflowThreshold = clientHeight * 1.1;
    if (scrollHeight > overflowThreshold) {
        floatVisible.value = true;
        const nb = scrollTop + clientHeight >= scrollHeight - 20;
        nearBottom.value = nb;
    } else {
        floatVisible.value = false;
    }
}

function onClick() {
    const cm = document.getElementById('contentMain');
    if (cm) {
        const nb = cm.scrollTop + cm.clientHeight >= cm.scrollHeight - 20;
        cm.scrollTo({ top: nb ? 0 : cm.scrollHeight, behavior: 'smooth' });
    } else {
        const nb =
            document.documentElement.scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 20;
        if (nb) window.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
}

function onScroll() {
    updateVisibility();
}

function onResize() {
    updateVisibility();
}

function onLocaleChanged() {
    updateVisibility();
}

onMounted(() => {
    const cm = document.getElementById('contentMain');
    scrollListenEl = cm;
    if (cm) {
        cm.addEventListener('scroll', onScroll, { passive: true });
    } else {
        scrollOnWindow = true;
        window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('bookmark-locale-changed', onLocaleChanged);
    resizeObs = new ResizeObserver(function () {
        updateVisibility();
    });
    resizeObserveTarget = cm || document.body;
    resizeObs.observe(resizeObserveTarget);
    updateVisibility();
});

onUnmounted(() => {
    if (scrollOnWindow) window.removeEventListener('scroll', onScroll);
    else if (scrollListenEl) scrollListenEl.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('bookmark-locale-changed', onLocaleChanged);
    if (resizeObs && resizeObserveTarget) {
        try {
            resizeObs.unobserve(resizeObserveTarget);
            resizeObs.disconnect();
        } catch (e) {}
        resizeObs = null;
        resizeObserveTarget = null;
    }
});

defineExpose({ updateVisibility });
</script>
