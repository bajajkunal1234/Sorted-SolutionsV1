'use client';

import { CartProvider } from './CartContext';
import DesktopHeader from './DesktopHeader';
import FloatingBottomDock from './FloatingBottomDock';
import FloatingCartBar from './FloatingCartBar';
import CartDrawer from './CartDrawer';
import LocationModal from './LocationModal';
import V2Footer from './V2Footer';

export default function V2Shell({ children, initialLogos = null }) {
    return (
        <CartProvider initialLogos={initialLogos}>
            <div className="v2-root">
                <DesktopHeader />
                <main className="v2-main">{children}</main>
                <V2Footer />
                <FloatingCartBar />
                <FloatingBottomDock />
                <CartDrawer />
                <LocationModal />
            </div>
        </CartProvider>
    );
}
