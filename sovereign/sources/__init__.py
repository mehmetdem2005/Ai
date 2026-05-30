"""Sovereign kaynak adapter'ları — PubMed, medRxiv, bioRxiv, ClinicalTrials."""
from .base import RawItem, Source
from .clinicaltrials import ClinicalTrialsSource
from .medrxiv import BioRxivSource, MedRxivSource
from .pubmed import PubMedSource

__all__ = [
    "RawItem",
    "Source",
    "PubMedSource",
    "MedRxivSource",
    "BioRxivSource",
    "ClinicalTrialsSource",
]


def all_sources() -> list[Source]:
    """Pipeline'ın varsayılan kaynak demeti."""
    return [
        PubMedSource(),
        MedRxivSource(),
        BioRxivSource(),
        ClinicalTrialsSource(),
    ]
