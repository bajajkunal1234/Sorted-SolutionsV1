'use client';

import { CartProvider } from './CartContext';
import DesktopHeader from './DesktopHeader';
import FloatingBottomDock from './FloatingBottomDock';
import FloatingCartBar from './FloatingCartBar';
import CartDrawer from './CartDrawer';
import LocationModal from './LocationModal';

export default function V2Shell({ children }) {
    return (
        <CartProvider>
            <div className="v2-root">
                <DesktopHeader />
                <main className="v2-main">{children}</main>
                <FloatingCartBar />
                <FloatingBottomDock />
                <CartDrawer />
                <LocationModal />
            </div>
        </CartProvider>
    );
}
