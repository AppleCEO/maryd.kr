const dgodicImage = document.querySelector('.dgodic-image');
const dgodicText = document.querySelector('.dgodic-text');
const dcursiveImage = document.querySelector('.dcursive-image');
const dcursiveText = document.querySelector('.dcursive-text');
const video = document.querySelector('.video-thumbnail-image');
const videoContainer = document.querySelector('.video-thumbnail');

const parallaxImages = document.querySelectorAll('.parallax-image');
const parallaxSpeedFactors = [-0.2, 0.6, 0.15, -0.3, -0.2, -0.15];

let desktopMeetingMoveAmount, mobileMeetingMoveAmount, endScroll, startScroll, videoContainerTop, finalScaleX, finalScaleY;
let isMerged = false;

function calculateDimensions() {
    if (!dgodicImage || !dcursiveImage || !videoContainer) return;

    const dgodicInitialRect = dgodicImage.getBoundingClientRect();
    const dcursiveInitialRect = dcursiveImage.getBoundingClientRect();
    const initialGap = dgodicInitialRect.left - dcursiveInitialRect.right;
    
    desktopMeetingMoveAmount = (initialGap / 2) + (window.innerWidth * 0.03);
    mobileMeetingMoveAmount = initialGap / 2 + 24;
    endScroll = desktopMeetingMoveAmount;

    videoContainerTop = videoContainer.offsetTop;
    startScroll = videoContainerTop - window.innerHeight / 2;

    finalScaleX = window.innerWidth / 640;
    finalScaleY = window.innerHeight / 360;
    
    if (window.innerWidth <= 768) {
        finalScaleX = 1;
        finalScaleY = 1;
    }
}

window.addEventListener('load', calculateDimensions); 
window.addEventListener('resize', calculateDimensions);

window.addEventListener('scroll', () => {
    if (window.innerWidth <= 768) {
        if (window.scrollY < 0) {
            return;
        }
        moveLogoImageForMobile();
    } else {
        moveLogoImageForDesktop();
    }

    scalingVideo();
    playParallax();

    function moveLogoImageForMobile(moveMltiplier) {
        const moveMultiplier = 2.5;
        const moveAmount = scrollY * moveMultiplier;

        if (!isMerged) {
            if (moveAmount >= mobileMeetingMoveAmount) {
                dcursiveImage.style.transform = `translateX(${mobileMeetingMoveAmount}px) translateY(120px)`;
                dgodicImage.style.transform = `translateX(-${mobileMeetingMoveAmount}px) translateY(120px)`;
                isMerged = true;
            } else {
                dcursiveImage.style.transform = `translateX(${moveAmount}px) translateY(${moveAmount / mobileMeetingMoveAmount * 120}px)`;
                dgodicImage.style.transform = `translateX(-${moveAmount}px) translateY(${moveAmount / mobileMeetingMoveAmount * 120}px)`;
            }
        }
    }

    function moveLogoImageForDesktop() {
        const moveMultiplier = 4;
        const moveAmount = scrollY * moveMultiplier;
        const diagonalSlope = 0.4;

        if (scrollY <= endScroll) {
            dcursiveImage.style.position = 'absolute';
            dcursiveImage.style.top = 'calc(50% - 2.2vw)';
            dcursiveImage.style.left = '4.2vw';
            dcursiveImage.style.zIndex = 'auto';

            dgodicImage.style.position = 'absolute';
            dgodicImage.style.top = '50%';
            dgodicImage.style.right = '4.2vw';
            dgodicImage.style.left = '';
            dgodicImage.style.zIndex = 'auto';

            const currentY = -moveAmount * diagonalSlope;

            if (moveAmount >= desktopMeetingMoveAmount) {
                const finalY = -desktopMeetingMoveAmount * diagonalSlope;
                dcursiveImage.style.transform = `translateX(${desktopMeetingMoveAmount}px) translateY(${finalY}px)`;
                dgodicImage.style.transform = `translateX(-${desktopMeetingMoveAmount}px) translateY(${finalY}px)`;
            } else {
                dcursiveImage.style.transform = `translateX(${moveAmount}px) translateY(${currentY}px)`;
                dgodicImage.style.transform = `translateX(-${moveAmount}px) translateY(${currentY}px)`;
            }
        }
    }

    function scalingVideo() {
        if (window.innerWidth <= 768) {
            video.style.transform = 'scale(1)';
        } else {
            const moveAmount = scrollY * 3;
            const currentY = -moveAmount;

            let progress = moveAmount / desktopMeetingMoveAmount;
            if (progress > 1) progress = 1;
            if (progress < 0) progress = 0;
            const maxScale = 2;
            const currentScale = 1 + (maxScale - 1) * progress;


            if (moveAmount >= desktopMeetingMoveAmount) {
                const finalY = -desktopMeetingMoveAmount;
                video.style.transform = `scale(${maxScale})`;
            } else if (currentScale < maxScale) {
                video.style.transform = `scale(${currentScale})`;
            }
        }
    }

    function playParallax() {
        parallaxImages.forEach((piece, index) => {
            const speed = parallaxSpeedFactors[index] || 0;
            const moveY = scrollY * speed;
            piece.style.transform = `translateY(${moveY}px)`;
        });
    }
});