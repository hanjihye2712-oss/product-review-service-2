document.addEventListener("DOMContentLoaded", function () {
    const productDetailBox = document.getElementById("productDetailBox");

    const productId = window.PRODUCT_ID;

    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");

    const reviewForm = document.getElementById("reviewCreateForm");
    const contentInput = document.getElementById("content");
    const ratingInput = document.getElementById("rating");
    const imageInput = document.getElementById("images");
    const previewBox = document.getElementById("previewBox");
    const reviewList = document.getElementById("reviewList");

    const api = window.api || axios;

    function getAuthHeaders(extraHeaders = {}) {
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        const headers = { ...extraHeaders };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    async function loadProductDetail() {
        try {
            const response = await api.get(`/products/api/${productId}/`);
            const product = response.data;

            productDetailBox.innerHTML = `
                <img src="${product.image_url || ""}" alt="${product.name}" class="thumb">
                <h1>${product.name}</h1>
                <p>${product.description || ""}</p>
                <p><strong>${Number(product.price).toLocaleString()}원</strong></p>
                <p class="muted">등록일: ${product.created_at || "-"}</p>
            `;
        } catch (error) {
            productDetailBox.innerHTML = `<p>상품 상세 정보를 불러오지 못했습니다.</p>`;
        }
    }

    async function loadReviews() {
        try {
            const response = await api.get(`/reviews/?product=${productId}`);
            const data = response.data;
            const reviews = data.results || data;

            reviewList.innerHTML = "";

            if (!reviews || reviews.length === 0) {
                reviewList.innerHTML = "<p>아직 등록된 리뷰가 없습니다.</p>";
                return;
            }

            // [수정] 안내 문구를 "비동기 처리" 기준으로 변경
            const guideBox = document.createElement("div");
            guideBox.innerHTML = `
                <p>
                    비슷한 후기를 비동기로 찾아 보여줍니다.
                </p>
            `;
            reviewList.appendChild(guideBox);

            reviews.forEach((review) => {
                const card = document.createElement("div");

                card.innerHTML = `
                    <p>${review.content}</p>

                    <!-- [수정] 버튼 스타일 제거 (UI 분리) -->
                    <button class="ai-analyze-btn" data-review-id="${review.id}">
                        비슷한 후기 보기
                    </button>

                    <!-- [수정] 결과 영역 스타일 최소화 -->
                    <div id="ai-result-${review.id}" style="display:none;"></div>
                `;

                reviewList.appendChild(card);
            });

            bindAnalyzeButtons();

        } catch (error) {
            reviewList.innerHTML = "<p>리뷰 목록을 불러오지 못했습니다.</p>";
        }
    }

    // =========================================================
    // [추가] Celery 상태 polling 함수
    // 기존 코드에는 없음
    // =========================================================
    async function pollTaskStatus(taskId, reviewId, button, resultBox) {
        const intervalId = setInterval(async () => {
            try {
                // [추가] 상태 조회 API 호출
                const response = await api.get(`/ai/tasks/${taskId}/status/`);
                const data = response.data;

                // [추가] 작업 완료 시 결과 렌더링
                if (data.status === "SUCCESS") {
                    clearInterval(intervalId);

                    const result = data.result || {};

                    resultBox.innerHTML = `
                        <p>결과 개수: ${result.similar_reviews?.length || 0}</p>
                    `;

                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                // [추가] 진행 중 상태 표시
                resultBox.innerHTML = `<p>분석 중... (${data.status})</p>`;

            } catch (error) {
                clearInterval(intervalId);
            }
        }, 1500);
    }

    // =========================================================
    // [핵심 수정] 버튼 클릭 로직 변경
    // 기존: GET → 즉시 결과 반환
    // 변경: POST → 작업 등록 → polling
    // =========================================================
    function bindAnalyzeButtons() {
        const buttons = document.querySelectorAll(".ai-analyze-btn");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const reviewId = button.dataset.reviewId;
                const resultBox = document.getElementById(`ai-result-${reviewId}`);

                button.disabled = true;

                // [수정] 문구 변경 (즉시 분석 → 작업 등록)
                button.textContent = "작업 등록 중...";

                resultBox.style.display = "block";
                resultBox.innerHTML = "<p>작업 등록 중...</p>";

                try {
                    // [핵심 수정]
                    // 기존: GET /ai/reviews/{id}/analyze/
                    // 변경: POST → Celery 작업 등록
                    const response = await api.post(
                        `/ai/reviews/${reviewId}/analyze/`,
                        {},
                        { headers: getAuthHeaders() }
                    );

                    const taskId = response.data.task_id;

                    // [추가] task_id 기반 polling 시작
                    button.textContent = "분석 진행 중...";
                    pollTaskStatus(taskId, reviewId, button, resultBox);

                } catch (error) {
                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                }
            });
        });
    }

    loadProductDetail();
    loadReviews();
});