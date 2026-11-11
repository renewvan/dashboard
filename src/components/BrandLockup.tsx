import lockupLight from '../../assets/logo/svg/renewvan-lockup-light.svg'
import lockupDark from '../../assets/logo/svg/renewvan-lockup-dark.svg'

/**
 * The Renewvan logo for the standalone pages (sign-in, wake): the dark-theme lockup in dark mode, `h-14`
 * on a phone and `h-11` on a short (landscape) screen, where the page has to fit without scrolling.
 */
export function BrandLockup() {
  const size = 'mb-2 h-14 [@media(max-height:480px)]:mb-0 [@media(max-height:480px)]:h-11'
  return (
    <>
      <img src={lockupLight} alt="Renewvan" className={`${size} dark:hidden`} />
      <img src={lockupDark} alt="Renewvan" className={`${size} hidden dark:block`} />
    </>
  )
}
