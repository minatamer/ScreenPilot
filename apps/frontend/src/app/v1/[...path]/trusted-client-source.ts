import {
  normalizeRequestSourceAddress,
  UNRESOLVED_REQUEST_SOURCE,
} from "@screenpilot/contracts/security/request-source";

export function resolveGoogleAppendedClientSource(
  forwardedFor: string | null,
): string {
  if (forwardedFor === null) {
    return UNRESOLVED_REQUEST_SOURCE;
  }

  const loadBalancerSeparator = forwardedFor.lastIndexOf(",");
  if (loadBalancerSeparator < 0) {
    return UNRESOLVED_REQUEST_SOURCE;
  }

  const precedingChain = forwardedFor.slice(0, loadBalancerSeparator);
  const clientSeparator = precedingChain.lastIndexOf(",");
  const clientCandidate = precedingChain.slice(clientSeparator + 1);
  const loadBalancerCandidate = forwardedFor.slice(loadBalancerSeparator + 1);
  const clientAddress = normalizeRequestSourceAddress(clientCandidate);
  const loadBalancerAddress = normalizeRequestSourceAddress(
    loadBalancerCandidate,
  );

  return clientAddress === null || loadBalancerAddress === null
    ? UNRESOLVED_REQUEST_SOURCE
    : clientAddress;
}
