document.addEventListener('DOMContentLoaded', () => {
    // Create the modal container
    const modal = document.createElement('div');
    modal.className = 'mermaid-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'mermaid-modal-content';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mermaid-modal-close';
    closeBtn.innerHTML = '&times;';
    
    const svgContainer = document.createElement('div');
    svgContainer.style.width = '100%';
    svgContainer.style.height = '100%';
    svgContainer.style.overflow = 'auto';
    svgContainer.style.display = 'block'; // block allows scrolling without flex centering issues
    svgContainer.style.padding = '20px';
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(svgContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close modal function
    const closeModal = () => {
        modal.classList.remove('active');
        svgContainer.innerHTML = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target === modalContent || e.target === svgContainer) closeModal();
    });

    // We need to wait for mermaid to render. Mermaid replaces <pre class="mermaid"> with <svg>
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName && node.tagName.toLowerCase() === 'svg' && node.id && node.id.startsWith('mermaid-')) {
                    // Prevent infinite loop by checking if it's already wrapped
                    if (node.parentNode && node.parentNode.classList.contains('mermaid-wrapper')) {
                        return;
                    }
                    
                    // Wrap it in a relative container so we can position the button
                    const wrapper = document.createElement('div');
                    wrapper.className = 'mermaid-wrapper';
                    
                    const parent = node.parentNode;
                    parent.insertBefore(wrapper, node);
                    wrapper.appendChild(node);
                    
                    // Add maximize button
                    const btn = document.createElement('button');
                    btn.className = 'mermaid-maximize-btn';
                    btn.title = 'View Fullscreen';
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
                    
                    wrapper.appendChild(btn);
                    
                    // Click handler to open modal
                    btn.addEventListener('click', () => {
                        const svgClone = node.cloneNode(true);
                        
                        // Remove constraints
                        svgClone.removeAttribute('width');
                        svgClone.removeAttribute('height');
                        svgClone.removeAttribute('style');
                        
                        // Force a huge width so the text becomes very large and readable.
                        // The user can scroll around the diagram inside the modal.
                        svgClone.style.width = '150vw';
                        svgClone.style.height = 'auto';
                        svgClone.style.minWidth = '1200px'; // Ensure it's big even on small screens
                        
                        svgContainer.innerHTML = '';
                        svgContainer.appendChild(svgClone);
                        modal.classList.add('active');
                    });
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
